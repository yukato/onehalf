import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getCompanyPool, ensureCompanyDatabase } from '@/lib/company-db';

// ---------- Row types ----------

interface CustomerRow extends RowDataPacket {
  id: bigint;
  code: string;
  name: string;
  name_kana: string | null;
  customer_type: 'customer' | 'supplier' | 'both';
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  contact_person: string | null;
  payment_terms: string | null;
  notes: string | null;
  is_active: number;
  created_at: Date;
  updated_at: Date;
}

interface ProductCategoryRow extends RowDataPacket {
  id: bigint;
  name: string;
  slug: string;
  sort_order: number;
  created_at: Date;
}

interface ProductRow extends RowDataPacket {
  id: bigint;
  code: string;
  name: string;
  name_kana: string | null;
  category_id: bigint | null;
  unit: string;
  unit_price: string; // DECIMAL comes as string
  cost_price: string;
  tax_rate: string;
  description: string | null;
  is_active: number;
  created_at: Date;
  updated_at: Date;
  // JOIN fields
  category_name?: string;
  category_slug?: string;
  category_sort_order?: number;
}

interface CountRow extends RowDataPacket {
  total: number;
}

// ---------- Helper ----------

async function pool(companySlug: string) {
  await ensureCompanyDatabase(companySlug);
  return getCompanyPool(companySlug);
}

// ---------- Customers ----------

export interface ListCustomersOptions {
  type?: string;
  q?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export async function listCustomers(companySlug: string, opts: ListCustomersOptions = {}) {
  const p = await pool(companySlug);
  const { type, q, isActive, limit = 50, offset = 0 } = opts;

  let where = '1=1';
  const params: (string | number)[] = [];

  if (type) {
    where += ' AND customer_type = ?';
    params.push(type);
  }
  if (isActive !== undefined) {
    where += ' AND is_active = ?';
    params.push(isActive ? 1 : 0);
  }
  if (q) {
    where += ' AND (name LIKE ? OR code LIKE ? OR name_kana LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  const [countRows] = await p.execute<CountRow[]>(
    `SELECT COUNT(*) AS total FROM customers WHERE ${where}`,
    params
  );
  const total = countRows[0]?.total ?? 0;

  const [rows] = await p.execute<CustomerRow[]>(
    `SELECT * FROM customers WHERE ${where} ORDER BY code ASC LIMIT ? OFFSET ?`,
    [...params, String(limit), String(offset)]
  );

  return {
    customers: rows.map(formatCustomer),
    total,
  };
}

export async function getCustomer(companySlug: string, id: string) {
  const p = await pool(companySlug);
  const [rows] = await p.execute<CustomerRow[]>('SELECT * FROM customers WHERE id = ?', [id]);
  if (rows.length === 0) return null;
  return formatCustomer(rows[0]);
}

export async function insertCustomer(
  companySlug: string,
  data: {
    code: string;
    name: string;
    nameKana?: string;
    customerType: string;
    postalCode?: string;
    address?: string;
    phone?: string;
    fax?: string;
    email?: string;
    contactPerson?: string;
    paymentTerms?: string;
    notes?: string;
  }
) {
  const p = await pool(companySlug);
  const [result] = await p.execute<ResultSetHeader>(
    `INSERT INTO customers (code, name, name_kana, customer_type, postal_code, address, phone, fax, email, contact_person, payment_terms, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.code, data.name, data.nameKana || null, data.customerType,
      data.postalCode || null, data.address || null, data.phone || null, data.fax || null,
      data.email || null, data.contactPerson || null, data.paymentTerms || null, data.notes || null,
    ]
  );
  return result.insertId.toString();
}

export async function updateCustomer(
  companySlug: string,
  id: string,
  data: Record<string, unknown>
) {
  const p = await pool(companySlug);
  const fieldMap: Record<string, string> = {
    code: 'code', name: 'name', nameKana: 'name_kana', customerType: 'customer_type',
    postalCode: 'postal_code', address: 'address', phone: 'phone', fax: 'fax',
    email: 'email', contactPerson: 'contact_person', paymentTerms: 'payment_terms',
    notes: 'notes', isActive: 'is_active',
  };

  const sets: string[] = [];
  const params: unknown[] = [];

  for (const [key, col] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(key === 'isActive' ? (data[key] ? 1 : 0) : data[key]);
    }
  }

  if (sets.length === 0) return;
  params.push(id);
  await p.execute(`UPDATE customers SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function deleteCustomer(companySlug: string, id: string) {
  const p = await pool(companySlug);
  await p.execute('DELETE FROM customers WHERE id = ?', [id]);
}

function formatCustomer(r: CustomerRow) {
  return {
    id: r.id.toString(),
    code: r.code,
    name: r.name,
    nameKana: r.name_kana,
    customerType: r.customer_type,
    postalCode: r.postal_code,
    address: r.address,
    phone: r.phone,
    fax: r.fax,
    email: r.email,
    contactPerson: r.contact_person,
    paymentTerms: r.payment_terms,
    notes: r.notes,
    isActive: !!r.is_active,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

// ---------- Product Categories ----------

export async function listProductCategories(companySlug: string) {
  const p = await pool(companySlug);
  const [rows] = await p.execute<ProductCategoryRow[]>(
    'SELECT * FROM product_categories ORDER BY sort_order ASC, created_at ASC'
  );
  return rows.map((r) => ({
    id: r.id.toString(),
    name: r.name,
    slug: r.slug,
    sortOrder: r.sort_order,
  }));
}

export async function createProductCategory(
  companySlug: string,
  data: { name: string; slug: string; sortOrder?: number }
) {
  const p = await pool(companySlug);
  const [result] = await p.execute<ResultSetHeader>(
    'INSERT INTO product_categories (name, slug, sort_order) VALUES (?, ?, ?)',
    [data.name, data.slug, data.sortOrder ?? 0]
  );
  return result.insertId.toString();
}

export async function updateProductCategory(
  companySlug: string,
  id: string,
  data: { name?: string; slug?: string; sortOrder?: number }
) {
  const p = await pool(companySlug);
  const sets: string[] = [];
  const params: unknown[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
  if (data.slug !== undefined) { sets.push('slug = ?'); params.push(data.slug); }
  if (data.sortOrder !== undefined) { sets.push('sort_order = ?'); params.push(data.sortOrder); }
  if (sets.length === 0) return;
  params.push(id);
  await p.execute(`UPDATE product_categories SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function deleteProductCategory(companySlug: string, id: string) {
  const p = await pool(companySlug);
  await p.execute('DELETE FROM product_categories WHERE id = ?', [id]);
}

// ---------- Products ----------

export interface ListProductsOptions {
  categoryId?: string;
  q?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export async function listProducts(companySlug: string, opts: ListProductsOptions = {}) {
  const p = await pool(companySlug);
  const { categoryId, q, isActive, limit = 50, offset = 0 } = opts;

  let where = '1=1';
  const params: (string | number)[] = [];

  if (categoryId) {
    where += ' AND p.category_id = ?';
    params.push(categoryId);
  }
  if (isActive !== undefined) {
    where += ' AND p.is_active = ?';
    params.push(isActive ? 1 : 0);
  }
  if (q) {
    where += ' AND (p.name LIKE ? OR p.code LIKE ? OR p.name_kana LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  const [countRows] = await p.execute<CountRow[]>(
    `SELECT COUNT(*) AS total FROM products p WHERE ${where}`,
    params
  );
  const total = countRows[0]?.total ?? 0;

  const [rows] = await p.execute<ProductRow[]>(
    `SELECT p.*, pc.name AS category_name, pc.slug AS category_slug, pc.sort_order AS category_sort_order
     FROM products p
     LEFT JOIN product_categories pc ON pc.id = p.category_id
     WHERE ${where}
     ORDER BY p.code ASC LIMIT ? OFFSET ?`,
    [...params, String(limit), String(offset)]
  );

  return {
    products: rows.map(formatProduct),
    total,
  };
}

export async function getProduct(companySlug: string, id: string) {
  const p = await pool(companySlug);
  const [rows] = await p.execute<ProductRow[]>(
    `SELECT p.*, pc.name AS category_name, pc.slug AS category_slug, pc.sort_order AS category_sort_order
     FROM products p
     LEFT JOIN product_categories pc ON pc.id = p.category_id
     WHERE p.id = ?`,
    [id]
  );
  if (rows.length === 0) return null;
  return formatProduct(rows[0]);
}

export async function insertProduct(
  companySlug: string,
  data: {
    code: string;
    name: string;
    nameKana?: string;
    categoryId?: string;
    unit?: string;
    unitPrice: number;
    costPrice?: number;
    taxRate?: number;
    description?: string;
  }
) {
  const p = await pool(companySlug);
  const [result] = await p.execute<ResultSetHeader>(
    `INSERT INTO products (code, name, name_kana, category_id, unit, unit_price, cost_price, tax_rate, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.code, data.name, data.nameKana || null,
      data.categoryId || null, data.unit || '個',
      data.unitPrice, data.costPrice ?? 0, data.taxRate ?? 10.00,
      data.description || null,
    ]
  );
  return result.insertId.toString();
}

export async function updateProduct(
  companySlug: string,
  id: string,
  data: Record<string, unknown>
) {
  const p = await pool(companySlug);
  const fieldMap: Record<string, string> = {
    code: 'code', name: 'name', nameKana: 'name_kana', categoryId: 'category_id',
    unit: 'unit', unitPrice: 'unit_price', costPrice: 'cost_price', taxRate: 'tax_rate',
    description: 'description', isActive: 'is_active',
  };

  const sets: string[] = [];
  const params: unknown[] = [];

  for (const [key, col] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(key === 'isActive' ? (data[key] ? 1 : 0) : data[key]);
    }
  }

  if (sets.length === 0) return;
  params.push(id);
  await p.execute(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function deleteProduct(companySlug: string, id: string) {
  const p = await pool(companySlug);
  await p.execute('DELETE FROM products WHERE id = ?', [id]);
}

function formatProduct(r: ProductRow) {
  return {
    id: r.id.toString(),
    code: r.code,
    name: r.name,
    nameKana: r.name_kana,
    category: r.category_id ? {
      id: r.category_id.toString(),
      name: r.category_name || '',
      slug: r.category_slug || '',
      sortOrder: r.category_sort_order ?? 0,
    } : null,
    categoryId: r.category_id?.toString() || null,
    unit: r.unit,
    unitPrice: parseFloat(r.unit_price),
    costPrice: parseFloat(r.cost_price),
    taxRate: parseFloat(r.tax_rate),
    description: r.description,
    isActive: !!r.is_active,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

// ---------- CSV Import ----------

export async function importCustomersFromCsv(
  companySlug: string,
  rows: Record<string, string>[]
) {
  const p = await pool(companySlug);
  let imported = 0;
  let skipped = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.code || !row.name) {
        errors.push({ row: i + 1, message: 'code と name は必須です' });
        skipped++;
        continue;
      }
      await p.execute<ResultSetHeader>(
        `INSERT INTO customers (code, name, name_kana, customer_type, postal_code, address, phone, fax, email, contact_person, payment_terms, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), name_kana = VALUES(name_kana),
         postal_code = VALUES(postal_code), address = VALUES(address), phone = VALUES(phone),
         fax = VALUES(fax), email = VALUES(email), contact_person = VALUES(contact_person),
         payment_terms = VALUES(payment_terms), notes = VALUES(notes)`,
        [
          row.code, row.name, row.name_kana || null,
          row.customer_type || 'customer',
          row.postal_code || null, row.address || null,
          row.phone || null, row.fax || null, row.email || null,
          row.contact_person || null, row.payment_terms || null, row.notes || null,
        ]
      );
      imported++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push({ row: i + 1, message });
      skipped++;
    }
  }

  return { imported, skipped, errors };
}

export async function importProductsFromCsv(
  companySlug: string,
  rows: Record<string, string>[]
) {
  const p = await pool(companySlug);
  let imported = 0;
  let skipped = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.code || !row.name) {
        errors.push({ row: i + 1, message: 'code と name は必須です' });
        skipped++;
        continue;
      }
      await p.execute<ResultSetHeader>(
        `INSERT INTO products (code, name, name_kana, unit, unit_price, cost_price, tax_rate, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), name_kana = VALUES(name_kana),
         unit = VALUES(unit), unit_price = VALUES(unit_price), cost_price = VALUES(cost_price),
         tax_rate = VALUES(tax_rate), description = VALUES(description)`,
        [
          row.code, row.name, row.name_kana || null,
          row.unit || '個',
          parseFloat(row.unit_price || '0'),
          parseFloat(row.cost_price || '0'),
          parseFloat(row.tax_rate || '10'),
          row.description || null,
        ]
      );
      imported++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push({ row: i + 1, message });
      skipped++;
    }
  }

  return { imported, skipped, errors };
}

// ---------- Number Sequences ----------

export async function getNextNumber(
  companySlug: string,
  sequenceType: string,
  prefix: string
): Promise<string> {
  const p = await pool(companySlug);
  const fiscalYear = new Date().getFullYear();
  const conn = await p.getConnection();

  try {
    await conn.beginTransaction();

    // Upsert: create if not exists, then increment
    await conn.execute(
      `INSERT INTO number_sequences (sequence_type, prefix, current_number, fiscal_year)
       VALUES (?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE current_number = current_number + 1`,
      [sequenceType, prefix, fiscalYear]
    );

    const [rows] = await conn.execute<(RowDataPacket & { current_number: number })[]>(
      'SELECT current_number FROM number_sequences WHERE sequence_type = ? AND fiscal_year = ?',
      [sequenceType, fiscalYear]
    );

    await conn.commit();

    const num = rows[0]?.current_number ?? 1;
    return `${prefix}${fiscalYear}-${String(num).padStart(5, '0')}`;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
