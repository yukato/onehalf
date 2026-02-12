import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getCompanyPool, ensureCompanyDatabase, escapeLike } from '@/lib/company-db';
import { getNextNumber } from '@/lib/masters/queries';

// ---------- Row types ----------

interface OrderRow extends RowDataPacket {
  id: bigint;
  order_number: string;
  sales_number: string | null;
  customer_id: bigint;
  quotation_id: bigint | null;
  order_date: string;
  delivery_date: string | null;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  notes: string | null;
  internal_memo: string | null;
  status: string;
  order_type: string | null;
  custom_fields: string | null;
  created_by: bigint;
  created_by_name: string;
  created_at: Date;
  updated_at: Date;
  // JOIN
  customer_name?: string;
  customer_code?: string;
}

interface OrderItemRow extends RowDataPacket {
  id: bigint;
  order_id: bigint;
  sort_order: number;
  product_id: bigint | null;
  product_code: string | null;
  product_name: string;
  quantity: string;
  delivered_quantity: string;
  unit: string;
  unit_price: string;
  tax_rate: string;
  amount: string;
  notes: string | null;
}

interface CountRow extends RowDataPacket {
  total: number;
}

// ---------- Helper ----------

async function pool(companySlug: string) {
  await ensureCompanyDatabase(companySlug);
  return getCompanyPool(companySlug);
}

// ---------- Orders ----------

export interface ListOrdersOptions {
  customerId?: string;
  status?: string;
  orderType?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export async function listOrders(companySlug: string, opts: ListOrdersOptions = {}) {
  const p = await pool(companySlug);
  const { customerId, status, orderType, q, limit = 50, offset = 0 } = opts;

  let where = '1=1';
  const params: (string | number)[] = [];

  if (customerId) { where += ' AND o.customer_id = ?'; params.push(customerId); }
  if (status) { where += ' AND o.status = ?'; params.push(status); }
  if (orderType) { where += ' AND o.order_type = ?'; params.push(orderType); }
  if (q) {
    where += ' AND (o.order_number LIKE ? OR o.sales_number LIKE ? OR c.name LIKE ?)';
    const like = `%${escapeLike(q)}%`;
    params.push(like, like, like);
  }

  // Run count and data queries in parallel
  const [countResult, dataResult] = await Promise.all([
    p.execute<CountRow[]>(
      `SELECT COUNT(*) AS total FROM orders o LEFT JOIN customers c ON c.id = o.customer_id WHERE ${where}`,
      params
    ),
    p.execute<OrderRow[]>(
      `SELECT o.*, c.name AS customer_name, c.code AS customer_code
       FROM orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       WHERE ${where}
       ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)]
    ),
  ]);

  return {
    orders: dataResult[0].map(formatOrder),
    total: countResult[0][0]?.total ?? 0,
  };
}

export async function getOrder(companySlug: string, id: string) {
  const p = await pool(companySlug);

  const [rows] = await p.execute<OrderRow[]>(
    `SELECT o.*, c.name AS customer_name, c.code AS customer_code
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     WHERE o.id = ?`,
    [id]
  );
  if (rows.length === 0) return null;

  const [items] = await p.execute<OrderItemRow[]>(
    'SELECT * FROM order_items WHERE order_id = ? ORDER BY sort_order ASC',
    [id]
  );

  return {
    ...formatOrder(rows[0]),
    items: items.map(formatOrderItem),
  };
}

export async function insertOrder(
  companySlug: string,
  data: {
    customerId: string;
    quotationId?: string;
    orderDate: string;
    deliveryDate?: string;
    notes?: string;
    internalMemo?: string;
    orderType?: string;
    customFields?: Record<string, unknown>;
    items: {
      productId?: string;
      productCode?: string;
      productName: string;
      quantity: number;
      unit?: string;
      unitPrice: number;
      taxRate?: number;
      notes?: string;
    }[];
    createdBy: string;
    createdByName: string;
  }
) {
  const p = await pool(companySlug);
  const conn = await p.getConnection();

  try {
    await conn.beginTransaction();

    const orderNumber = await getNextNumber(companySlug, 'order', 'O-');
    const salesNumber = await getNextNumber(companySlug, 'sales', 'S-');

    let subtotal = 0;
    let taxAmount = 0;
    const itemsWithAmounts = data.items.map((item, i) => {
      const amount = item.quantity * item.unitPrice;
      const tax = Math.floor(amount * (item.taxRate ?? 10) / 100);
      subtotal += amount;
      taxAmount += tax;
      return { ...item, amount, sortOrder: i };
    });

    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO orders (order_number, sales_number, customer_id, quotation_id, order_date, delivery_date,
       subtotal, tax_amount, total_amount, notes, internal_memo, order_type, custom_fields, created_by, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber, salesNumber, data.customerId, data.quotationId || null,
        data.orderDate, data.deliveryDate || null,
        subtotal, taxAmount, subtotal + taxAmount,
        data.notes || null, data.internalMemo || null,
        data.orderType || 'general', data.customFields ? JSON.stringify(data.customFields) : null,
        data.createdBy, data.createdByName,
      ]
    );

    const orderId = result.insertId;

    // Batch INSERT all items in a single query
    if (itemsWithAmounts.length > 0) {
      const placeholders = itemsWithAmounts.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const params: (string | number | null)[] = [];
      for (const item of itemsWithAmounts) {
        params.push(
          orderId.toString(), item.sortOrder, item.productId || null, item.productCode || null,
          item.productName, item.quantity, item.unit || '個',
          item.unitPrice, item.taxRate ?? 10, item.amount, item.notes || null,
        );
      }
      await conn.execute(
        `INSERT INTO order_items (order_id, sort_order, product_id, product_code, product_name,
         quantity, unit, unit_price, tax_rate, amount, notes)
         VALUES ${placeholders}`,
        params
      );
    }

    // If created from quotation, update quotation status
    if (data.quotationId) {
      await conn.execute(
        "UPDATE quotations SET status = 'accepted' WHERE id = ?",
        [data.quotationId]
      );
    }

    await conn.commit();
    return orderId.toString();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateOrderStatus(companySlug: string, id: string, status: string) {
  const p = await pool(companySlug);
  await p.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
}

export async function deleteOrder(companySlug: string, id: string) {
  const p = await pool(companySlug);
  await p.execute('DELETE FROM orders WHERE id = ?', [id]);
}

// ---------- Create from Quotation ----------

export async function createOrderFromQuotation(companySlug: string, quotationId: string, createdBy: string, createdByName: string) {
  const p = await pool(companySlug);

  // Get quotation with items
  const { getQuotation } = await import('@/lib/quotations/queries');
  const quotation = await getQuotation(companySlug, quotationId);
  if (!quotation) throw new Error('Quotation not found');

  return insertOrder(companySlug, {
    customerId: quotation.customerId,
    quotationId,
    orderDate: new Date().toISOString().split('T')[0],
    notes: quotation.notes || undefined,
    items: quotation.items.map((item) => ({
      productId: item.productId || undefined,
      productCode: item.productCode || undefined,
      productName: item.productName,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      notes: item.notes || undefined,
    })),
    createdBy,
    createdByName,
  });
}

// ---------- Format ----------

function formatOrder(r: OrderRow) {
  let customFields = null;
  if (r.custom_fields) {
    try {
      customFields = typeof r.custom_fields === 'string' ? JSON.parse(r.custom_fields) : r.custom_fields;
    } catch {
      customFields = null;
    }
  }
  return {
    id: r.id.toString(),
    orderNumber: r.order_number,
    salesNumber: r.sales_number,
    customerId: r.customer_id.toString(),
    customer: {
      id: r.customer_id.toString(),
      name: r.customer_name || '',
      code: r.customer_code || '',
    },
    quotationId: r.quotation_id?.toString() || null,
    orderDate: r.order_date,
    deliveryDate: r.delivery_date,
    subtotal: parseFloat(r.subtotal),
    taxAmount: parseFloat(r.tax_amount),
    totalAmount: parseFloat(r.total_amount),
    notes: r.notes,
    internalMemo: r.internal_memo,
    status: r.status,
    orderType: r.order_type || 'general',
    customFields,
    createdByName: r.created_by_name,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

function formatOrderItem(r: OrderItemRow) {
  return {
    id: r.id.toString(),
    sortOrder: r.sort_order,
    productId: r.product_id?.toString() || null,
    productCode: r.product_code,
    productName: r.product_name,
    quantity: parseFloat(r.quantity),
    deliveredQuantity: parseFloat(r.delivered_quantity),
    unit: r.unit,
    unitPrice: parseFloat(r.unit_price),
    taxRate: parseFloat(r.tax_rate),
    amount: parseFloat(r.amount),
    notes: r.notes,
  };
}
