import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getCompanyPool, ensureCompanyDatabase } from '@/lib/company-db';
import { getNextNumber } from '@/lib/masters/queries';
import type { OcrExtraction, OcrExtractedData } from '@/types';

// ---------- Row types ----------

interface OcrExtractionRow extends RowDataPacket {
  id: bigint;
  source_image_path: string;
  source_image_url: string;
  source_type: 'fax' | 'email' | 'upload';
  extracted_data: string | null;
  matched_customer_id: bigint | null;
  matched_customer_name: string | null;
  match_confidence: number | null;
  status: OcrExtraction['status'];
  error_message: string | null;
  converted_order_id: bigint | null;
  created_by: bigint;
  created_by_name: string;
  created_at: Date;
  updated_at: Date;
}

interface CountRow extends RowDataPacket {
  total: number;
}

// ---------- Helper ----------

async function pool(companySlug: string) {
  await ensureCompanyDatabase(companySlug);
  return getCompanyPool(companySlug);
}

function rowToExtraction(r: OcrExtractionRow): OcrExtraction {
  let extractedData: OcrExtractedData | null = null;
  if (r.extracted_data) {
    try {
      extractedData = typeof r.extracted_data === 'string'
        ? JSON.parse(r.extracted_data)
        : r.extracted_data;
    } catch {
      extractedData = null;
    }
  }

  return {
    id: r.id.toString(),
    sourceImageUrl: r.source_image_url,
    sourceType: r.source_type,
    extractedData,
    matchedCustomerId: r.matched_customer_id?.toString() ?? null,
    matchedCustomerName: r.matched_customer_name,
    matchConfidence: r.match_confidence ? Number(r.match_confidence) : null,
    status: r.status,
    errorMessage: r.error_message,
    convertedOrderId: r.converted_order_id?.toString() ?? null,
    createdByName: r.created_by_name,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

// ---------- Queries ----------

export async function listOcrExtractions(
  companySlug: string,
  opts: { status?: string; limit?: number; offset?: number } = {}
) {
  const p = await pool(companySlug);
  const { status, limit = 50, offset = 0 } = opts;

  let where = '1=1';
  const params: (string | number)[] = [];

  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }

  const [countRows] = await p.execute<CountRow[]>(
    `SELECT COUNT(*) AS total FROM ocr_extractions WHERE ${where}`,
    params
  );
  const total = countRows[0]?.total ?? 0;

  const [rows] = await p.execute<OcrExtractionRow[]>(
    `SELECT * FROM ocr_extractions WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, String(limit), String(offset)]
  );

  return {
    extractions: rows.map(rowToExtraction),
    total,
  };
}

export async function getOcrExtraction(companySlug: string, id: string) {
  const p = await pool(companySlug);
  const [rows] = await p.execute<OcrExtractionRow[]>(
    'SELECT * FROM ocr_extractions WHERE id = ?',
    [id]
  );
  if (rows.length === 0) return null;
  return rowToExtraction(rows[0]);
}

export async function insertOcrExtraction(
  companySlug: string,
  data: {
    sourceImagePath: string;
    sourceImageUrl: string;
    sourceType: 'fax' | 'email' | 'upload';
    createdBy: string;
    createdByName: string;
  }
) {
  const p = await pool(companySlug);
  const [result] = await p.execute<ResultSetHeader>(
    `INSERT INTO ocr_extractions (source_image_path, source_image_url, source_type, status, created_by, created_by_name)
     VALUES (?, ?, ?, 'pending', ?, ?)`,
    [data.sourceImagePath, data.sourceImageUrl, data.sourceType, data.createdBy, data.createdByName]
  );
  return result.insertId.toString();
}

export async function updateOcrExtraction(
  companySlug: string,
  id: string,
  data: {
    extractedData?: OcrExtractedData;
    matchedCustomerId?: string | null;
    matchedCustomerName?: string | null;
    matchConfidence?: number | null;
    status?: OcrExtraction['status'];
    errorMessage?: string;
    convertedOrderId?: string;
  }
) {
  const p = await pool(companySlug);
  const sets: string[] = [];
  const params: (string | null)[] = [];

  if (data.extractedData !== undefined) {
    sets.push('extracted_data = ?');
    params.push(JSON.stringify(data.extractedData));
  }
  if (data.matchedCustomerId !== undefined) {
    sets.push('matched_customer_id = ?');
    params.push(data.matchedCustomerId);
  }
  if (data.matchedCustomerName !== undefined) {
    sets.push('matched_customer_name = ?');
    params.push(data.matchedCustomerName);
  }
  if (data.matchConfidence !== undefined) {
    sets.push('match_confidence = ?');
    params.push(data.matchConfidence !== null ? String(data.matchConfidence) : null);
  }
  if (data.status !== undefined) {
    sets.push('status = ?');
    params.push(data.status);
  }
  if (data.errorMessage !== undefined) {
    sets.push('error_message = ?');
    params.push(data.errorMessage);
  }
  if (data.convertedOrderId !== undefined) {
    sets.push('converted_order_id = ?');
    params.push(data.convertedOrderId);
  }

  if (sets.length === 0) return;
  params.push(id);
  await p.execute(
    `UPDATE ocr_extractions SET ${sets.join(', ')} WHERE id = ?`,
    params
  );
}

export async function convertOcrToOrder(
  companySlug: string,
  ocrId: string,
  orderData: {
    customerId: string;
    orderDate: string;
    items: {
      productId?: string;
      productCode?: string;
      productName: string;
      quantity: number;
      unit?: string;
      unitPrice: number;
      taxRate?: number;
    }[];
    notes?: string;
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

    // Calculate totals (Math.floor for tax, matching lib/orders/queries.ts)
    let subtotal = 0;
    let taxAmount = 0;
    const itemsWithAmounts = orderData.items.map((item, i) => {
      const amount = item.quantity * item.unitPrice;
      const tax = Math.floor(amount * (item.taxRate ?? 10) / 100);
      subtotal += amount;
      taxAmount += tax;
      return { ...item, amount, sortOrder: i };
    });
    const totalAmount = subtotal + taxAmount;

    // Insert order
    const [orderResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO orders (order_number, sales_number, customer_id, order_date, delivery_date,
       subtotal, tax_amount, total_amount, notes, internal_memo, status, created_by, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        orderNumber, salesNumber, orderData.customerId, orderData.orderDate, null,
        subtotal, taxAmount, totalAmount,
        orderData.notes || null, null,
        orderData.createdBy, orderData.createdByName,
      ]
    );
    const orderId = orderResult.insertId.toString();

    // Insert order items
    for (const item of itemsWithAmounts) {
      await conn.execute(
        `INSERT INTO order_items (order_id, sort_order, product_id, product_code, product_name,
         quantity, unit, unit_price, tax_rate, amount, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId, item.sortOrder, item.productId || null, item.productCode || null,
          item.productName, item.quantity, item.unit || '個',
          item.unitPrice, item.taxRate ?? 10, item.amount, null,
        ]
      );
    }

    await conn.commit();

    // Update OCR extraction with converted order ID (outside transaction - non-critical)
    await updateOcrExtraction(companySlug, ocrId, {
      status: 'converted',
      convertedOrderId: orderId,
    });

    return { orderId, orderNumber };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
