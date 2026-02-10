import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getCompanyPool, ensureCompanyDatabase } from '@/lib/company-db';
import { getNextNumber } from '@/lib/masters/queries';

// ---------- Row types ----------

interface DeliveryNoteRow extends RowDataPacket {
  id: bigint;
  delivery_number: string;
  order_id: bigint;
  customer_id: bigint;
  delivery_date: string;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  notes: string | null;
  status: string;
  created_by: bigint;
  created_by_name: string;
  created_at: Date;
  updated_at: Date;
  // JOIN
  customer_name?: string;
  customer_code?: string;
  order_number?: string;
  sales_number?: string;
}

interface DeliveryNoteItemRow extends RowDataPacket {
  id: bigint;
  delivery_note_id: bigint;
  order_item_id: bigint | null;
  sort_order: number;
  product_id: bigint | null;
  product_code: string | null;
  product_name: string;
  quantity: string;
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

// ---------- Delivery Notes ----------

export interface ListDeliveryNotesOptions {
  customerId?: string;
  orderId?: string;
  status?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export async function listDeliveryNotes(companySlug: string, opts: ListDeliveryNotesOptions = {}) {
  const p = await pool(companySlug);
  const { customerId, orderId, status, q, limit = 50, offset = 0 } = opts;

  let where = '1=1';
  const params: (string | number)[] = [];

  if (customerId) { where += ' AND d.customer_id = ?'; params.push(customerId); }
  if (orderId) { where += ' AND d.order_id = ?'; params.push(orderId); }
  if (status) { where += ' AND d.status = ?'; params.push(status); }
  if (q) {
    where += ' AND (d.delivery_number LIKE ? OR c.name LIKE ? OR o.order_number LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  const [countRows] = await p.execute<CountRow[]>(
    `SELECT COUNT(*) AS total FROM delivery_notes d
     LEFT JOIN customers c ON c.id = d.customer_id
     LEFT JOIN orders o ON o.id = d.order_id
     WHERE ${where}`,
    params
  );

  const [rows] = await p.execute<DeliveryNoteRow[]>(
    `SELECT d.*, c.name AS customer_name, c.code AS customer_code,
            o.order_number, o.sales_number
     FROM delivery_notes d
     LEFT JOIN customers c ON c.id = d.customer_id
     LEFT JOIN orders o ON o.id = d.order_id
     WHERE ${where}
     ORDER BY d.created_at DESC LIMIT ? OFFSET ?`,
    [...params, String(limit), String(offset)]
  );

  return {
    deliveryNotes: rows.map(formatDeliveryNote),
    total: countRows[0]?.total ?? 0,
  };
}

export async function getDeliveryNote(companySlug: string, id: string) {
  const p = await pool(companySlug);

  const [rows] = await p.execute<DeliveryNoteRow[]>(
    `SELECT d.*, c.name AS customer_name, c.code AS customer_code,
            o.order_number, o.sales_number
     FROM delivery_notes d
     LEFT JOIN customers c ON c.id = d.customer_id
     LEFT JOIN orders o ON o.id = d.order_id
     WHERE d.id = ?`,
    [id]
  );
  if (rows.length === 0) return null;

  const [items] = await p.execute<DeliveryNoteItemRow[]>(
    'SELECT * FROM delivery_note_items WHERE delivery_note_id = ? ORDER BY sort_order ASC',
    [id]
  );

  return {
    ...formatDeliveryNote(rows[0]),
    items: items.map(formatDeliveryNoteItem),
  };
}

export async function createDeliveryNoteFromOrder(
  companySlug: string,
  orderId: string,
  createdBy: string,
  createdByName: string,
  deliveryDate?: string
) {
  const p = await pool(companySlug);
  const conn = await p.getConnection();

  try {
    await conn.beginTransaction();

    // Get order with items
    const { getOrder } = await import('@/lib/orders/queries');
    const order = await getOrder(companySlug, orderId);
    if (!order) throw new Error('Order not found');

    const deliveryNumber = await getNextNumber(companySlug, 'delivery', 'D-');
    const date = deliveryDate || new Date().toISOString().split('T')[0];

    // Calculate totals from items
    let subtotal = 0;
    let taxAmount = 0;
    const itemsData = order.items.map((item, i) => {
      const remainingQty = item.quantity - item.deliveredQuantity;
      if (remainingQty <= 0) return null;
      const amount = remainingQty * item.unitPrice;
      const tax = Math.floor(amount * item.taxRate / 100);
      subtotal += amount;
      taxAmount += tax;
      return {
        orderItemId: item.id,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        quantity: remainingQty,
        unit: item.unit,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        amount,
        sortOrder: i,
      };
    }).filter(Boolean);

    if (itemsData.length === 0) throw new Error('No items to deliver');

    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO delivery_notes (delivery_number, order_id, customer_id, delivery_date,
       subtotal, tax_amount, total_amount, notes, created_by, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deliveryNumber, orderId, order.customerId, date,
        subtotal, taxAmount, subtotal + taxAmount,
        null, createdBy, createdByName,
      ]
    );

    const deliveryNoteId = result.insertId;

    for (const item of itemsData) {
      if (!item) continue;
      await conn.execute(
        `INSERT INTO delivery_note_items (delivery_note_id, order_item_id, sort_order,
         product_id, product_code, product_name, quantity, unit, unit_price, tax_rate, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          deliveryNoteId, item.orderItemId, item.sortOrder,
          item.productId || null, item.productCode || null,
          item.productName, item.quantity, item.unit,
          item.unitPrice, item.taxRate, item.amount,
        ]
      );

      // Update delivered_quantity on order_items
      await conn.execute(
        'UPDATE order_items SET delivered_quantity = delivered_quantity + ? WHERE id = ?',
        [item.quantity, item.orderItemId]
      );
    }

    await conn.commit();
    return deliveryNoteId.toString();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateDeliveryNoteStatus(companySlug: string, id: string, status: string) {
  const p = await pool(companySlug);
  await p.execute('UPDATE delivery_notes SET status = ? WHERE id = ?', [status, id]);
}

export async function deleteDeliveryNote(companySlug: string, id: string) {
  const p = await pool(companySlug);
  await p.execute('DELETE FROM delivery_notes WHERE id = ?', [id]);
}

// ---------- Format ----------

function formatDeliveryNote(r: DeliveryNoteRow) {
  return {
    id: r.id.toString(),
    deliveryNumber: r.delivery_number,
    orderId: r.order_id.toString(),
    order: {
      id: r.order_id.toString(),
      orderNumber: r.order_number || '',
      salesNumber: r.sales_number || null,
    },
    customerId: r.customer_id.toString(),
    customer: {
      id: r.customer_id.toString(),
      name: r.customer_name || '',
      code: r.customer_code || '',
    },
    deliveryDate: r.delivery_date,
    subtotal: parseFloat(r.subtotal),
    taxAmount: parseFloat(r.tax_amount),
    totalAmount: parseFloat(r.total_amount),
    notes: r.notes,
    status: r.status,
    createdByName: r.created_by_name,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

function formatDeliveryNoteItem(r: DeliveryNoteItemRow) {
  return {
    id: r.id.toString(),
    orderItemId: r.order_item_id?.toString() || null,
    sortOrder: r.sort_order,
    productId: r.product_id?.toString() || null,
    productCode: r.product_code,
    productName: r.product_name,
    quantity: parseFloat(r.quantity),
    unit: r.unit,
    unitPrice: parseFloat(r.unit_price),
    taxRate: parseFloat(r.tax_rate),
    amount: parseFloat(r.amount),
    notes: r.notes,
  };
}
