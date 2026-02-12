import type { RowDataPacket } from 'mysql2';
import { getCompanyPool, ensureCompanyDatabase } from '@/lib/company-db';
import type { AutoSuggestion, OrderSuggestion } from '@/types';

// ---------- Row types ----------

interface ReadyOrderRow extends RowDataPacket {
  id: bigint;
  order_number: string;
  customer_name: string;
}

interface ConfirmedDnRow extends RowDataPacket {
  customer_id: bigint;
  customer_name: string;
  dn_count: number;
  total_amount: string;
}

interface OverdueInvoiceRow extends RowDataPacket {
  id: bigint;
  invoice_number: string;
  customer_id: bigint;
  customer_name: string;
  due_date: string;
  total_amount: string;
  paid_amount: string;
}

interface TopProductRow extends RowDataPacket {
  product_id: bigint;
  product_name: string;
  avg_quantity: string;
  frequency: number;
  last_ordered: string;
}

interface OrderIntervalRow extends RowDataPacket {
  avg_interval: string | null;
  last_order_date: string | null;
}

interface CustomerNameRow extends RowDataPacket {
  name: string;
}

interface CurrentOrderItemRow extends RowDataPacket {
  product_id: bigint | null;
  product_name: string;
  quantity: string;
}

interface AvgQuantityRow extends RowDataPacket {
  avg_quantity: string;
}

// ---------- Helper ----------

async function pool(companySlug: string) {
  await ensureCompanyDatabase(companySlug);
  return getCompanyPool(companySlug);
}

// ---------- 7B: Auto-generation Suggestions ----------

export async function getAutoGenerateSuggestions(companySlug: string): Promise<AutoSuggestion[]> {
  const p = await pool(companySlug);

  // Run all 3 independent queries in parallel
  const [readyOrders, confirmedDns, overdueInvoices] = await Promise.all([
    p.execute<ReadyOrderRow[]>(
      `SELECT o.id, o.order_number, c.name AS customer_name
       FROM orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       WHERE o.status = 'ready'
         AND NOT EXISTS (SELECT 1 FROM delivery_notes dn WHERE dn.order_id = o.id)
       ORDER BY o.created_at DESC
       LIMIT 20`
    ).then(([rows]) => rows),

    p.execute<ConfirmedDnRow[]>(
      `SELECT dn.customer_id, c.name AS customer_name,
              COUNT(*) AS dn_count,
              SUM(dn.total_amount) AS total_amount
       FROM delivery_notes dn
       LEFT JOIN customers c ON c.id = dn.customer_id
       WHERE dn.status = 'confirmed'
         AND NOT EXISTS (
           SELECT 1 FROM invoice_items ii WHERE ii.delivery_note_id = dn.id
         )
       GROUP BY dn.customer_id, c.name
       ORDER BY total_amount DESC
       LIMIT 20`
    ).then(([rows]) => rows),

    p.execute<OverdueInvoiceRow[]>(
      `SELECT i.id, i.invoice_number, i.customer_id, c.name AS customer_name,
              i.due_date, i.total_amount,
              COALESCE(paid.total_paid, 0) AS paid_amount
       FROM invoices i
       LEFT JOIN customers c ON c.id = i.customer_id
       LEFT JOIN (SELECT invoice_id, SUM(amount) AS total_paid FROM payments GROUP BY invoice_id) paid
         ON paid.invoice_id = i.id
       WHERE i.status IN ('sent', 'issued', 'partially_paid')
         AND i.due_date < CURDATE()
       ORDER BY i.due_date ASC
       LIMIT 20`
    ).then(([rows]) => rows),
  ]);

  const suggestions: AutoSuggestion[] = [];
  let idCounter = 0;

  for (const row of readyOrders) {
    suggestions.push({
      id: `suggestion-${++idCounter}`,
      type: 'create_delivery_note',
      title: '納品書を作成',
      description: `受注 ${row.order_number}（${row.customer_name}）は準備完了ですが、納品書が未作成です`,
      targetType: 'order',
      targetId: row.id.toString(),
      targetLabel: row.order_number,
      priority: 'high',
    });
  }

  for (const row of confirmedDns) {
    suggestions.push({
      id: `suggestion-${++idCounter}`,
      type: 'create_invoice',
      title: '請求書を生成',
      description: `${row.customer_name} の確認済み納品書が${row.dn_count}件あります（合計 ¥${Number(row.total_amount).toLocaleString()}）`,
      targetType: 'customer',
      targetId: row.customer_id.toString(),
      targetLabel: row.customer_name,
      priority: 'medium',
    });
  }

  for (const row of overdueInvoices) {
    const remaining = parseFloat(row.total_amount) - parseFloat(row.paid_amount);
    suggestions.push({
      id: `suggestion-${++idCounter}`,
      type: 'follow_up',
      title: '支払いフォローアップ',
      description: `${row.customer_name} の請求書 ${row.invoice_number} が期限超過です（残額 ¥${remaining.toLocaleString()}、期限: ${row.due_date}）`,
      targetType: 'customer',
      targetId: row.customer_id.toString(),
      targetLabel: row.customer_name,
      priority: 'high',
    });
  }

  return suggestions;
}

// ---------- 7D: Smart Order Suggestions ----------

export async function getOrderSuggestions(companySlug: string, customerId: string): Promise<OrderSuggestion | null> {
  const p = await pool(companySlug);

  // Run all 3 independent queries in parallel
  const [customerResult, topProductsResult, intervalResult] = await Promise.all([
    p.execute<CustomerNameRow[]>(
      'SELECT name FROM customers WHERE id = ?',
      [customerId]
    ).then(([rows]) => rows),

    p.execute<TopProductRow[]>(
      `SELECT oi.product_id, oi.product_name,
              AVG(oi.quantity) AS avg_quantity,
              COUNT(DISTINCT oi.order_id) AS frequency,
              MAX(o.order_date) AS last_ordered
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.customer_id = ?
         AND o.order_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
         AND o.status NOT IN ('cancelled')
       GROUP BY oi.product_id, oi.product_name
       ORDER BY frequency DESC, avg_quantity DESC
       LIMIT 10`,
      [customerId]
    ).then(([rows]) => rows),

    p.execute<OrderIntervalRow[]>(
      `SELECT
         AVG(DATEDIFF(next_date, order_date)) AS avg_interval,
         MAX(order_date) AS last_order_date
       FROM (
         SELECT o.order_date,
                LEAD(o.order_date) OVER (ORDER BY o.order_date) AS next_date
         FROM orders o
         WHERE o.customer_id = ?
           AND o.status NOT IN ('cancelled')
         ORDER BY o.order_date
       ) sub
       WHERE next_date IS NOT NULL`,
      [customerId]
    ).then(([rows]) => rows),
  ]);

  if (customerResult.length === 0) return null;
  const customerName = customerResult[0].name;

  if (topProductsResult.length === 0) return { customerId, customerName, topProducts: [], avgOrderInterval: null, lastOrderDate: null };

  const avgInterval = intervalResult[0]?.avg_interval ? Math.round(parseFloat(intervalResult[0].avg_interval)) : null;
  const lastOrderDate = intervalResult[0]?.last_order_date || null;

  return {
    customerId,
    customerName,
    topProducts: topProductsResult.map(r => ({
      productId: r.product_id?.toString() || '',
      productName: r.product_name,
      avgQuantity: Math.round(parseFloat(r.avg_quantity) * 10) / 10,
      frequency: r.frequency,
      lastOrdered: r.last_ordered,
    })),
    avgOrderInterval: avgInterval,
    lastOrderDate,
  };
}

// ---------- Anomaly Detection ----------

export async function checkOrderAnomaly(
  companySlug: string,
  customerId: string,
  currentItems: { productId?: string; productName: string; quantity: number }[]
): Promise<string | undefined> {
  const p = await pool(companySlug);

  // Collect all product IDs that need checking
  const itemsWithProductId = currentItems.filter(item => item.productId);
  if (itemsWithProductId.length === 0) return undefined;

  const productIds = itemsWithProductId.map(item => item.productId!);
  const placeholders = productIds.map(() => '?').join(',');

  // Single batch query for all product averages
  const [avgRows] = await p.execute<(AvgQuantityRow & { product_id: bigint })[]>(
    `SELECT oi.product_id, AVG(oi.quantity) AS avg_quantity
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.customer_id = ?
       AND oi.product_id IN (${placeholders})
       AND o.status NOT IN ('cancelled')
       AND o.order_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
     GROUP BY oi.product_id`,
    [customerId, ...productIds]
  );

  // Build a map of product_id -> avg_quantity
  const avgMap = new Map<string, number>();
  for (const row of avgRows) {
    const avg = row.avg_quantity ? parseFloat(row.avg_quantity) : 0;
    if (avg > 0) avgMap.set(row.product_id.toString(), avg);
  }

  const warnings: string[] = [];
  for (const item of itemsWithProductId) {
    const avg = avgMap.get(item.productId!);
    if (!avg) continue;

    const ratio = item.quantity / avg;
    if (ratio >= 3) {
      warnings.push(`${item.productName}: 通常の${ratio.toFixed(1)}倍の数量（平均${Math.round(avg)}、今回${item.quantity}）`);
    } else if (ratio <= 0.3) {
      warnings.push(`${item.productName}: 通常より大幅に少ない（平均${Math.round(avg)}、今回${item.quantity}）`);
    }
  }

  return warnings.length > 0 ? warnings.join('、') : undefined;
}
