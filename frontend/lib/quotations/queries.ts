import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getCompanyPool, ensureCompanyDatabase } from '@/lib/company-db';
import { getNextNumber } from '@/lib/masters/queries';

// ---------- Row types ----------

interface QuotationRow extends RowDataPacket {
  id: bigint;
  quotation_number: string;
  customer_id: bigint;
  subject: string | null;
  quotation_date: string;
  valid_until: string | null;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  notes: string | null;
  internal_memo: string | null;
  status: string;
  created_by: bigint;
  created_by_name: string;
  created_at: Date;
  updated_at: Date;
  // JOIN
  customer_name?: string;
  customer_code?: string;
}

interface QuotationItemRow extends RowDataPacket {
  id: bigint;
  quotation_id: bigint;
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

// ---------- Quotations ----------

export interface ListQuotationsOptions {
  customerId?: string;
  status?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export async function listQuotations(companySlug: string, opts: ListQuotationsOptions = {}) {
  const p = await pool(companySlug);
  const { customerId, status, q, limit = 50, offset = 0 } = opts;

  let where = '1=1';
  const params: (string | number)[] = [];

  if (customerId) { where += ' AND q.customer_id = ?'; params.push(customerId); }
  if (status) { where += ' AND q.status = ?'; params.push(status); }
  if (q) {
    where += ' AND (q.quotation_number LIKE ? OR q.subject LIKE ? OR c.name LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  const [countRows] = await p.execute<CountRow[]>(
    `SELECT COUNT(*) AS total FROM quotations q LEFT JOIN customers c ON c.id = q.customer_id WHERE ${where}`,
    params
  );

  const [rows] = await p.execute<QuotationRow[]>(
    `SELECT q.*, c.name AS customer_name, c.code AS customer_code
     FROM quotations q
     LEFT JOIN customers c ON c.id = q.customer_id
     WHERE ${where}
     ORDER BY q.created_at DESC LIMIT ? OFFSET ?`,
    [...params, String(limit), String(offset)]
  );

  return {
    quotations: rows.map(formatQuotation),
    total: countRows[0]?.total ?? 0,
  };
}

export async function getQuotation(companySlug: string, id: string) {
  const p = await pool(companySlug);

  const [rows] = await p.execute<QuotationRow[]>(
    `SELECT q.*, c.name AS customer_name, c.code AS customer_code
     FROM quotations q
     LEFT JOIN customers c ON c.id = q.customer_id
     WHERE q.id = ?`,
    [id]
  );
  if (rows.length === 0) return null;

  const [items] = await p.execute<QuotationItemRow[]>(
    'SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order ASC',
    [id]
  );

  return {
    ...formatQuotation(rows[0]),
    items: items.map(formatQuotationItem),
  };
}

export async function insertQuotation(
  companySlug: string,
  data: {
    customerId: string;
    subject?: string;
    quotationDate: string;
    validUntil?: string;
    notes?: string;
    internalMemo?: string;
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

    const quotationNumber = await getNextNumber(companySlug, 'quotation', 'Q-');

    // Calculate totals
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
      `INSERT INTO quotations (quotation_number, customer_id, subject, quotation_date, valid_until,
       subtotal, tax_amount, total_amount, notes, internal_memo, created_by, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        quotationNumber, data.customerId, data.subject || null,
        data.quotationDate, data.validUntil || null,
        subtotal, taxAmount, subtotal + taxAmount,
        data.notes || null, data.internalMemo || null,
        data.createdBy, data.createdByName,
      ]
    );

    const quotationId = result.insertId;

    for (const item of itemsWithAmounts) {
      await conn.execute(
        `INSERT INTO quotation_items (quotation_id, sort_order, product_id, product_code, product_name,
         quantity, unit, unit_price, tax_rate, amount, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          quotationId, item.sortOrder, item.productId || null, item.productCode || null,
          item.productName, item.quantity, item.unit || '個',
          item.unitPrice, item.taxRate ?? 10, item.amount, item.notes || null,
        ]
      );
    }

    await conn.commit();
    return quotationId.toString();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateQuotationStatus(companySlug: string, id: string, status: string) {
  const p = await pool(companySlug);
  await p.execute('UPDATE quotations SET status = ? WHERE id = ?', [status, id]);
}

export async function deleteQuotation(companySlug: string, id: string) {
  const p = await pool(companySlug);
  await p.execute('DELETE FROM quotations WHERE id = ?', [id]);
}

// ---------- Format ----------

function formatQuotation(r: QuotationRow) {
  return {
    id: r.id.toString(),
    quotationNumber: r.quotation_number,
    customerId: r.customer_id.toString(),
    customer: {
      id: r.customer_id.toString(),
      name: r.customer_name || '',
      code: r.customer_code || '',
    },
    subject: r.subject,
    quotationDate: r.quotation_date,
    validUntil: r.valid_until,
    subtotal: parseFloat(r.subtotal),
    taxAmount: parseFloat(r.tax_amount),
    totalAmount: parseFloat(r.total_amount),
    notes: r.notes,
    internalMemo: r.internal_memo,
    status: r.status,
    createdByName: r.created_by_name,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

function formatQuotationItem(r: QuotationItemRow) {
  return {
    id: r.id.toString(),
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
