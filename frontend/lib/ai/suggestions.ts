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
  const suggestions: AutoSuggestion[] = [];
  let idCounter = 0;

  // 1) Orders with status='ready' that have no delivery notes
  const [readyOrders] = await p.execute<ReadyOrderRow[]>(
    `SELECT o.id, o.order_number, c.name AS customer_name
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     WHERE o.status = 'ready'
       AND NOT EXISTS (SELECT 1 FROM delivery_notes dn WHERE dn.order_id = o.id)
     ORDER BY o.created_at DESC
     LIMIT 20`
  );

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

  // 2) Delivery notes with status='confirmed' that have no invoice
  const [confirmedDns] = await p.execute<ConfirmedDnRow[]>(
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
  );

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

  // 3) Overdue invoices → follow up
  const [overdueInvoices] = await p.execute<OverdueInvoiceRow[]>(
    `SELECT i.id, i.invoice_number, i.customer_id, c.name AS customer_name,
            i.due_date, i.total_amount,
            COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) AS paid_amount
     FROM invoices i
     LEFT JOIN customers c ON c.id = i.customer_id
     WHERE i.status IN ('sent', 'issued', 'partially_paid')
       AND i.due_date < CURDATE()
     ORDER BY i.due_date ASC
     LIMIT 20`
  );

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

  // Get customer name
  const [customerRows] = await p.execute<CustomerNameRow[]>(
    'SELECT name FROM customers WHERE id = ?',
    [customerId]
  );
  if (customerRows.length === 0) return null;
  const customerName = customerRows[0].name;

  // Top products by frequency and quantity (last 12 months)
  const [topProducts] = await p.execute<TopProductRow[]>(
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
  );

  if (topProducts.length === 0) return { customerId, customerName, topProducts: [], avgOrderInterval: null, lastOrderDate: null };

  // Average order interval and last order date
  const [intervalRows] = await p.execute<OrderIntervalRow[]>(
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
  );

  const avgInterval = intervalRows[0]?.avg_interval ? Math.round(parseFloat(intervalRows[0].avg_interval)) : null;
  const lastOrderDate = intervalRows[0]?.last_order_date || null;

  const suggestion: OrderSuggestion = {
    customerId,
    customerName,
    topProducts: topProducts.map(r => ({
      productId: r.product_id?.toString() || '',
      productName: r.product_name,
      avgQuantity: Math.round(parseFloat(r.avg_quantity) * 10) / 10,
      frequency: r.frequency,
      lastOrdered: r.last_ordered,
    })),
    avgOrderInterval: avgInterval,
    lastOrderDate,
  };

  return suggestion;
}

// ---------- Anomaly Detection ----------

export async function checkOrderAnomaly(
  companySlug: string,
  customerId: string,
  currentItems: { productId?: string; productName: string; quantity: number }[]
): Promise<string | undefined> {
  const p = await pool(companySlug);
  const warnings: string[] = [];

  for (const item of currentItems) {
    if (!item.productId) continue;

    const [avgRows] = await p.execute<AvgQuantityRow[]>(
      `SELECT AVG(oi.quantity) AS avg_quantity
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.customer_id = ?
         AND oi.product_id = ?
         AND o.status NOT IN ('cancelled')
         AND o.order_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)`,
      [customerId, item.productId]
    );

    const avg = avgRows[0]?.avg_quantity ? parseFloat(avgRows[0].avg_quantity) : null;
    if (avg === null || avg === 0) continue;

    const ratio = item.quantity / avg;
    if (ratio >= 3) {
      warnings.push(`${item.productName}: 通常の${ratio.toFixed(1)}倍の数量（平均${Math.round(avg)}、今回${item.quantity}）`);
    } else if (ratio <= 0.3) {
      warnings.push(`${item.productName}: 通常より大幅に少ない（平均${Math.round(avg)}、今回${item.quantity}）`);
    }
  }

  return warnings.length > 0 ? warnings.join('、') : undefined;
}
