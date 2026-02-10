import type { RowDataPacket } from 'mysql2';
import { getCompanyPool, ensureCompanyDatabase } from '@/lib/company-db';

// ---------- Helper ----------

async function pool(companySlug: string) {
  await ensureCompanyDatabase(companySlug);
  return getCompanyPool(companySlug);
}

// ---------- KPI Summary ----------

interface KpiRow extends RowDataPacket {
  total_sales: string;
  order_count: number;
  avg_order_amount: string;
  receivable_amount: string;
  receivable_count: number;
  monthly_sales: string;
  monthly_order_count: number;
}

export async function getDashboardSummary(companySlug: string) {
  const p = await pool(companySlug);

  // Total sales (completed orders)
  const [salesRows] = await p.execute<RowDataPacket[]>(
    `SELECT
       COALESCE(SUM(total_amount), 0) AS total_sales,
       COUNT(*) AS order_count,
       COALESCE(AVG(total_amount), 0) AS avg_order_amount
     FROM orders WHERE status NOT IN ('cancelled')`
  );

  // Receivables (unpaid/partially paid invoices)
  const [receivableRows] = await p.execute<RowDataPacket[]>(
    `SELECT
       COALESCE(SUM(i.total_amount - COALESCE(paid.total_paid, 0)), 0) AS receivable_amount,
       COUNT(*) AS receivable_count
     FROM invoices i
     LEFT JOIN (SELECT invoice_id, SUM(amount) AS total_paid FROM payments GROUP BY invoice_id) paid
       ON paid.invoice_id = i.id
     WHERE i.status IN ('sent', 'partially_paid', 'overdue')`
  );

  // This month's sales
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const [monthRows] = await p.execute<RowDataPacket[]>(
    `SELECT
       COALESCE(SUM(total_amount), 0) AS monthly_sales,
       COUNT(*) AS monthly_order_count
     FROM orders WHERE status NOT IN ('cancelled') AND order_date >= ?`,
    [monthStart]
  );

  return {
    totalSales: parseFloat(salesRows[0]?.total_sales || '0'),
    orderCount: salesRows[0]?.order_count || 0,
    avgOrderAmount: parseFloat(salesRows[0]?.avg_order_amount || '0'),
    receivableAmount: parseFloat(receivableRows[0]?.receivable_amount || '0'),
    receivableCount: receivableRows[0]?.receivable_count || 0,
    monthlySales: parseFloat(monthRows[0]?.monthly_sales || '0'),
    monthlyOrderCount: monthRows[0]?.monthly_order_count || 0,
  };
}

// ---------- Daily Sales ----------

interface DailySalesRow extends RowDataPacket {
  date: string;
  sales: string;
  count: number;
}

export async function getDailySales(companySlug: string, year: number, month: number) {
  const p = await pool(companySlug);
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const [rows] = await p.execute<DailySalesRow[]>(
    `SELECT
       DATE_FORMAT(order_date, '%Y-%m-%d') AS date,
       SUM(total_amount) AS sales,
       COUNT(*) AS count
     FROM orders
     WHERE status NOT IN ('cancelled')
       AND order_date LIKE ?
     GROUP BY DATE_FORMAT(order_date, '%Y-%m-%d')
     ORDER BY date ASC`,
    [`${monthStr}%`]
  );

  return rows.map(r => ({
    date: r.date,
    sales: parseFloat(r.sales),
    count: r.count,
  }));
}

// ---------- Monthly Sales ----------

interface MonthlySalesRow extends RowDataPacket {
  month: string;
  sales: string;
  count: number;
}

export async function getMonthlySales(companySlug: string, year: number) {
  const p = await pool(companySlug);

  const [rows] = await p.execute<MonthlySalesRow[]>(
    `SELECT
       DATE_FORMAT(order_date, '%Y-%m') AS month,
       SUM(total_amount) AS sales,
       COUNT(*) AS count
     FROM orders
     WHERE status NOT IN ('cancelled')
       AND YEAR(order_date) = ?
     GROUP BY DATE_FORMAT(order_date, '%Y-%m')
     ORDER BY month ASC`,
    [String(year)]
  );

  return rows.map(r => ({
    month: r.month,
    sales: parseFloat(r.sales),
    count: r.count,
  }));
}

// ---------- Top Customers ----------

interface TopCustomerRow extends RowDataPacket {
  customer_id: bigint;
  customer_name: string;
  customer_code: string;
  total_sales: string;
  order_count: number;
}

export async function getTopCustomers(companySlug: string, limit = 10) {
  const p = await pool(companySlug);

  const [rows] = await p.execute<TopCustomerRow[]>(
    `SELECT
       o.customer_id, c.name AS customer_name, c.code AS customer_code,
       SUM(o.total_amount) AS total_sales,
       COUNT(*) AS order_count
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     WHERE o.status NOT IN ('cancelled')
     GROUP BY o.customer_id, c.name, c.code
     ORDER BY total_sales DESC
     LIMIT ?`,
    [String(limit)]
  );

  return rows.map(r => ({
    customerId: r.customer_id.toString(),
    customerName: r.customer_name || '',
    customerCode: r.customer_code || '',
    totalSales: parseFloat(r.total_sales),
    orderCount: r.order_count,
  }));
}

// ---------- Top Products ----------

interface TopProductRow extends RowDataPacket {
  product_name: string;
  product_code: string;
  total_amount: string;
  total_quantity: string;
  order_count: number;
}

export async function getTopProducts(companySlug: string, limit = 10) {
  const p = await pool(companySlug);

  const [rows] = await p.execute<TopProductRow[]>(
    `SELECT
       oi.product_name, oi.product_code,
       SUM(oi.amount) AS total_amount,
       SUM(oi.quantity) AS total_quantity,
       COUNT(DISTINCT oi.order_id) AS order_count
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.status NOT IN ('cancelled')
     GROUP BY oi.product_name, oi.product_code
     ORDER BY total_amount DESC
     LIMIT ?`,
    [String(limit)]
  );

  return rows.map(r => ({
    productName: r.product_name,
    productCode: r.product_code || '',
    totalAmount: parseFloat(r.total_amount),
    totalQuantity: parseFloat(r.total_quantity),
    orderCount: r.order_count,
  }));
}

// ---------- Receivables ----------

interface ReceivableRow extends RowDataPacket {
  id: bigint;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  due_date: string | null;
  total_amount: string;
  paid_amount: string;
  status: string;
}

export async function getReceivables(companySlug: string) {
  const p = await pool(companySlug);

  const [rows] = await p.execute<ReceivableRow[]>(
    `SELECT
       i.id, i.invoice_number, c.name AS customer_name,
       i.invoice_date, i.due_date, i.total_amount,
       COALESCE(paid.total_paid, 0) AS paid_amount,
       i.status
     FROM invoices i
     LEFT JOIN customers c ON c.id = i.customer_id
     LEFT JOIN (SELECT invoice_id, SUM(amount) AS total_paid FROM payments GROUP BY invoice_id) paid
       ON paid.invoice_id = i.id
     WHERE i.status IN ('sent', 'partially_paid', 'overdue')
     ORDER BY i.due_date ASC, i.invoice_date ASC`
  );

  return rows.map(r => ({
    id: r.id.toString(),
    invoiceNumber: r.invoice_number,
    customerName: r.customer_name || '',
    invoiceDate: r.invoice_date,
    dueDate: r.due_date,
    totalAmount: parseFloat(r.total_amount),
    paidAmount: parseFloat(r.paid_amount),
    remainingAmount: parseFloat(r.total_amount) - parseFloat(r.paid_amount),
    status: r.status,
  }));
}

// ---------- Order Status Distribution ----------

interface StatusCountRow extends RowDataPacket {
  status: string;
  count: number;
}

export async function getOrderStatusDistribution(companySlug: string) {
  const p = await pool(companySlug);

  const [rows] = await p.execute<StatusCountRow[]>(
    `SELECT status, COUNT(*) AS count FROM orders GROUP BY status ORDER BY count DESC`
  );

  return rows.map(r => ({ status: r.status, count: r.count }));
}

// ---------- Recent Activity ----------

interface RecentOrderRow extends RowDataPacket {
  id: bigint;
  order_number: string;
  customer_name: string;
  total_amount: string;
  status: string;
  order_date: string;
  created_at: Date;
}

export async function getRecentOrders(companySlug: string, limit = 5) {
  const p = await pool(companySlug);

  const [rows] = await p.execute<RecentOrderRow[]>(
    `SELECT o.id, o.order_number, c.name AS customer_name,
            o.total_amount, o.status, o.order_date, o.created_at
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     ORDER BY o.created_at DESC
     LIMIT ?`,
    [String(limit)]
  );

  return rows.map(r => ({
    id: r.id.toString(),
    orderNumber: r.order_number,
    customerName: r.customer_name || '',
    totalAmount: parseFloat(r.total_amount),
    status: r.status,
    orderDate: r.order_date,
    createdAt: r.created_at.toISOString(),
  }));
}
