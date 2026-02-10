import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getCompanyPool, ensureCompanyDatabase } from '@/lib/company-db';
import { getNextNumber } from '@/lib/masters/queries';

// ---------- Row types ----------

interface InvoiceRow extends RowDataPacket {
  id: bigint;
  invoice_number: string;
  customer_id: bigint;
  billing_period_start: string | null;
  billing_period_end: string | null;
  invoice_date: string;
  due_date: string | null;
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
  // computed
  paid_amount?: string;
}

interface InvoiceItemRow extends RowDataPacket {
  id: bigint;
  invoice_id: bigint;
  delivery_note_id: bigint | null;
  order_id: bigint | null;
  sort_order: number;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  tax_rate: string;
  amount: string;
  notes: string | null;
}

interface PaymentRow extends RowDataPacket {
  id: bigint;
  invoice_id: bigint;
  payment_date: string;
  amount: string;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  created_by_name: string;
  created_at: Date;
}

interface CountRow extends RowDataPacket {
  total: number;
}

// ---------- Helper ----------

async function pool(companySlug: string) {
  await ensureCompanyDatabase(companySlug);
  return getCompanyPool(companySlug);
}

// ---------- Invoices ----------

export interface ListInvoicesOptions {
  customerId?: string;
  status?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export async function listInvoices(companySlug: string, opts: ListInvoicesOptions = {}) {
  const p = await pool(companySlug);
  const { customerId, status, q, limit = 50, offset = 0 } = opts;

  let where = '1=1';
  const params: (string | number)[] = [];

  if (customerId) { where += ' AND i.customer_id = ?'; params.push(customerId); }
  if (status) { where += ' AND i.status = ?'; params.push(status); }
  if (q) {
    where += ' AND (i.invoice_number LIKE ? OR c.name LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like);
  }

  const [countRows] = await p.execute<CountRow[]>(
    `SELECT COUNT(*) AS total FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id WHERE ${where}`,
    params
  );

  const [rows] = await p.execute<InvoiceRow[]>(
    `SELECT i.*, c.name AS customer_name, c.code AS customer_code,
            COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) AS paid_amount
     FROM invoices i
     LEFT JOIN customers c ON c.id = i.customer_id
     WHERE ${where}
     ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
    [...params, String(limit), String(offset)]
  );

  return {
    invoices: rows.map(formatInvoice),
    total: countRows[0]?.total ?? 0,
  };
}

export async function getInvoice(companySlug: string, id: string) {
  const p = await pool(companySlug);

  const [rows] = await p.execute<InvoiceRow[]>(
    `SELECT i.*, c.name AS customer_name, c.code AS customer_code,
            COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) AS paid_amount
     FROM invoices i
     LEFT JOIN customers c ON c.id = i.customer_id
     WHERE i.id = ?`,
    [id]
  );
  if (rows.length === 0) return null;

  const [items] = await p.execute<InvoiceItemRow[]>(
    'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC',
    [id]
  );

  const [payments] = await p.execute<PaymentRow[]>(
    'SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC',
    [id]
  );

  return {
    ...formatInvoice(rows[0]),
    items: items.map(formatInvoiceItem),
    payments: payments.map(formatPayment),
  };
}

export async function insertInvoice(
  companySlug: string,
  data: {
    customerId: string;
    billingPeriodStart?: string;
    billingPeriodEnd?: string;
    invoiceDate: string;
    dueDate?: string;
    notes?: string;
    items: {
      deliveryNoteId?: string;
      orderId?: string;
      description: string;
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

    const invoiceNumber = await getNextNumber(companySlug, 'invoice', 'INV-');

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
      `INSERT INTO invoices (invoice_number, customer_id, billing_period_start, billing_period_end,
       invoice_date, due_date, subtotal, tax_amount, total_amount, notes, created_by, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceNumber, data.customerId,
        data.billingPeriodStart || null, data.billingPeriodEnd || null,
        data.invoiceDate, data.dueDate || null,
        subtotal, taxAmount, subtotal + taxAmount,
        data.notes || null, data.createdBy, data.createdByName,
      ]
    );

    const invoiceId = result.insertId;

    for (const item of itemsWithAmounts) {
      await conn.execute(
        `INSERT INTO invoice_items (invoice_id, delivery_note_id, order_id, sort_order,
         description, quantity, unit, unit_price, tax_rate, amount, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceId, item.deliveryNoteId || null, item.orderId || null,
          item.sortOrder, item.description, item.quantity, item.unit || '式',
          item.unitPrice, item.taxRate ?? 10, item.amount, item.notes || null,
        ]
      );
    }

    await conn.commit();
    return invoiceId.toString();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function createInvoiceFromDeliveryNotes(
  companySlug: string,
  customerId: string,
  deliveryNoteIds: string[],
  invoiceDate: string,
  dueDate: string,
  createdBy: string,
  createdByName: string
) {
  const p = await pool(companySlug);
  const { listDeliveryNotes } = await import('@/lib/delivery-notes/queries');

  // Get delivery notes for this customer that are confirmed
  const items: {
    deliveryNoteId: string;
    orderId?: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    taxRate: number;
  }[] = [];

  for (const dnId of deliveryNoteIds) {
    const { getDeliveryNote } = await import('@/lib/delivery-notes/queries');
    const dn = await getDeliveryNote(companySlug, dnId);
    if (!dn) continue;

    for (const item of dn.items) {
      items.push({
        deliveryNoteId: dnId,
        orderId: dn.orderId,
        description: item.productName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
      });
    }
  }

  return insertInvoice(companySlug, {
    customerId,
    invoiceDate,
    dueDate,
    items,
    createdBy,
    createdByName,
  });
}

export async function updateInvoiceStatus(companySlug: string, id: string, status: string) {
  const p = await pool(companySlug);
  await p.execute('UPDATE invoices SET status = ? WHERE id = ?', [status, id]);
}

export async function deleteInvoice(companySlug: string, id: string) {
  const p = await pool(companySlug);
  await p.execute('DELETE FROM invoices WHERE id = ?', [id]);
}

// ---------- Payments ----------

export async function addPayment(
  companySlug: string,
  invoiceId: string,
  data: {
    paymentDate: string;
    amount: number;
    paymentMethod?: string;
    reference?: string;
    notes?: string;
    createdBy: string;
    createdByName: string;
  }
) {
  const p = await pool(companySlug);
  const conn = await p.getConnection();

  try {
    await conn.beginTransaction();

    await conn.execute(
      `INSERT INTO payments (invoice_id, payment_date, amount, payment_method, reference, notes, created_by, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceId, data.paymentDate, data.amount,
        data.paymentMethod || null, data.reference || null, data.notes || null,
        data.createdBy, data.createdByName,
      ]
    );

    // Check total paid and update invoice status
    const [paidRows] = await conn.execute<RowDataPacket[]>(
      'SELECT SUM(amount) AS total_paid FROM payments WHERE invoice_id = ?',
      [invoiceId]
    );
    const totalPaid = parseFloat(paidRows[0]?.total_paid || '0');

    const [invoiceRows] = await conn.execute<RowDataPacket[]>(
      'SELECT total_amount FROM invoices WHERE id = ?',
      [invoiceId]
    );
    const totalAmount = parseFloat(invoiceRows[0]?.total_amount || '0');

    let newStatus: string;
    if (totalPaid >= totalAmount) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'partially_paid';
    } else {
      newStatus = 'sent';
    }

    await conn.execute('UPDATE invoices SET status = ? WHERE id = ?', [newStatus, invoiceId]);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ---------- Format ----------

function formatInvoice(r: InvoiceRow) {
  return {
    id: r.id.toString(),
    invoiceNumber: r.invoice_number,
    customerId: r.customer_id.toString(),
    customer: {
      id: r.customer_id.toString(),
      name: r.customer_name || '',
      code: r.customer_code || '',
    },
    billingPeriodStart: r.billing_period_start,
    billingPeriodEnd: r.billing_period_end,
    invoiceDate: r.invoice_date,
    dueDate: r.due_date,
    subtotal: parseFloat(r.subtotal),
    taxAmount: parseFloat(r.tax_amount),
    totalAmount: parseFloat(r.total_amount),
    paidAmount: parseFloat(r.paid_amount || '0'),
    notes: r.notes,
    status: r.status,
    createdByName: r.created_by_name,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

function formatInvoiceItem(r: InvoiceItemRow) {
  return {
    id: r.id.toString(),
    deliveryNoteId: r.delivery_note_id?.toString() || null,
    orderId: r.order_id?.toString() || null,
    sortOrder: r.sort_order,
    description: r.description,
    quantity: parseFloat(r.quantity),
    unit: r.unit,
    unitPrice: parseFloat(r.unit_price),
    taxRate: parseFloat(r.tax_rate),
    amount: parseFloat(r.amount),
    notes: r.notes,
  };
}

function formatPayment(r: PaymentRow) {
  return {
    id: r.id.toString(),
    invoiceId: r.invoice_id.toString(),
    paymentDate: r.payment_date,
    amount: parseFloat(r.amount),
    paymentMethod: r.payment_method,
    reference: r.reference,
    notes: r.notes,
    createdByName: r.created_by_name,
    createdAt: r.created_at.toISOString(),
  };
}
