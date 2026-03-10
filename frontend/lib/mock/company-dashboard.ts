import type {
  DashboardSummary,
  DailySales,
  MonthlySales,
  TopCustomer,
  TopProduct,
  Receivable,
  RecentOrder,
  OrderStatusCount,
  DashboardSalesResponse,
  DashboardRankingsResponse,
} from '@/types';

// ---------- KPIサマリー ----------

export const mockDashboardSummary: DashboardSummary = {
  totalSales: 28450000,
  orderCount: 142,
  avgOrderAmount: 200352,
  receivableAmount: 3250000,
  receivableCount: 8,
  monthlySales: 4820000,
  monthlyOrderCount: 23,
};

// ---------- 日次売上 ----------

export const mockDailySales: DailySales[] = [
  { date: '2026-02-01', sales: 185000, count: 3 },
  { date: '2026-02-03', sales: 320000, count: 4 },
  { date: '2026-02-04', sales: 150000, count: 2 },
  { date: '2026-02-05', sales: 480000, count: 5 },
  { date: '2026-02-06', sales: 95000, count: 1 },
  { date: '2026-02-07', sales: 260000, count: 3 },
  { date: '2026-02-10', sales: 410000, count: 4 },
  { date: '2026-02-12', sales: 175000, count: 2 },
  { date: '2026-02-13', sales: 520000, count: 6 },
  { date: '2026-02-14', sales: 340000, count: 3 },
  { date: '2026-02-17', sales: 290000, count: 4 },
  { date: '2026-02-18', sales: 155000, count: 2 },
  { date: '2026-02-19', sales: 480000, count: 5 },
  { date: '2026-02-20', sales: 210000, count: 3 },
  { date: '2026-02-21', sales: 370000, count: 4 },
  { date: '2026-02-24', sales: 125000, count: 2 },
  { date: '2026-02-25', sales: 445000, count: 5 },
  { date: '2026-02-26', sales: 310000, count: 3 },
  { date: '2026-02-27', sales: 250000, count: 3 },
  { date: '2026-02-28', sales: 200000, count: 2 },
];

// ---------- 月次売上 ----------

export const mockMonthlySales: MonthlySales[] = [
  { month: '2026-01', sales: 5230000, count: 28 },
  { month: '2026-02', sales: 4820000, count: 23 },
  { month: '2025-12', sales: 3980000, count: 19 },
  { month: '2025-11', sales: 4150000, count: 21 },
  { month: '2025-10', sales: 3620000, count: 17 },
  { month: '2025-09', sales: 4480000, count: 24 },
  { month: '2025-08', sales: 2870000, count: 14 },
  { month: '2025-07', sales: 3350000, count: 16 },
  { month: '2025-06', sales: 4120000, count: 22 },
  { month: '2025-05', sales: 3780000, count: 18 },
  { month: '2025-04', sales: 4560000, count: 25 },
  { month: '2025-03', sales: 3910000, count: 20 },
];

// ---------- 取引先ランキング ----------

export const mockTopCustomers: TopCustomer[] = [
  { customerId: '1', customerName: '株式会社大阪グランドホテル', customerCode: 'C001', totalSales: 4850000, orderCount: 28 },
  { customerId: '2', customerName: '天満屋フードサービス株式会社', customerCode: 'C002', totalSales: 3920000, orderCount: 22 },
  { customerId: '3', customerName: '株式会社なにわ食品', customerCode: 'C003', totalSales: 3150000, orderCount: 18 },
  { customerId: '4', customerName: '南海ケータリング株式会社', customerCode: 'C004', totalSales: 2840000, orderCount: 15 },
  { customerId: '5', customerName: '株式会社京都料亭まつおか', customerCode: 'C005', totalSales: 2350000, orderCount: 12 },
  { customerId: '6', customerName: '新世界フーズ株式会社', customerCode: 'C006', totalSales: 1980000, orderCount: 11 },
  { customerId: '7', customerName: '有限会社堺水産市場', customerCode: 'C007', totalSales: 1650000, orderCount: 9 },
  { customerId: '8', customerName: '株式会社神戸ベイシェフ', customerCode: 'C008', totalSales: 1420000, orderCount: 8 },
];

// ---------- 商品ランキング ----------

export const mockTopProducts: TopProduct[] = [
  { productName: 'ステンレス作業台 1200mm', productCode: 'P001', totalAmount: 3600000, totalQuantity: 24, orderCount: 18 },
  { productName: '業務用冷蔵庫 縦型4ドア', productCode: 'P002', totalAmount: 2880000, totalQuantity: 8, orderCount: 8 },
  { productName: 'ガスコンロ 5口 都市ガス', productCode: 'P003', totalAmount: 2150000, totalQuantity: 15, orderCount: 12 },
  { productName: '食器洗浄機 アンダーカウンター', productCode: 'P004', totalAmount: 1920000, totalQuantity: 6, orderCount: 6 },
  { productName: 'シンク 2槽式 900mm', productCode: 'P005', totalAmount: 1540000, totalQuantity: 22, orderCount: 15 },
  { productName: '吊戸棚 ステンレス 1500mm', productCode: 'P006', totalAmount: 1280000, totalQuantity: 32, orderCount: 20 },
  { productName: 'フードカッター FC-200', productCode: 'P007', totalAmount: 980000, totalQuantity: 14, orderCount: 10 },
  { productName: 'スチームコンベクションオーブン', productCode: 'P008', totalAmount: 850000, totalQuantity: 2, orderCount: 2 },
];

// ---------- 未収金 ----------

export const mockReceivables: Receivable[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2026-0042',
    customerName: '株式会社大阪グランドホテル',
    invoiceDate: '2026-01-31',
    dueDate: '2026-02-28',
    totalAmount: 850000,
    paidAmount: 0,
    remainingAmount: 850000,
    status: 'sent',
  },
  {
    id: '2',
    invoiceNumber: 'INV-2026-0038',
    customerName: '天満屋フードサービス株式会社',
    invoiceDate: '2026-01-25',
    dueDate: '2026-02-25',
    totalAmount: 620000,
    paidAmount: 310000,
    remainingAmount: 310000,
    status: 'partially_paid',
  },
  {
    id: '3',
    invoiceNumber: 'INV-2026-0031',
    customerName: '株式会社なにわ食品',
    invoiceDate: '2026-01-15',
    dueDate: '2026-02-15',
    totalAmount: 480000,
    paidAmount: 0,
    remainingAmount: 480000,
    status: 'overdue',
  },
  {
    id: '4',
    invoiceNumber: 'INV-2026-0045',
    customerName: '南海ケータリング株式会社',
    invoiceDate: '2026-02-05',
    dueDate: '2026-03-05',
    totalAmount: 350000,
    paidAmount: 0,
    remainingAmount: 350000,
    status: 'sent',
  },
  {
    id: '5',
    invoiceNumber: 'INV-2026-0028',
    customerName: '株式会社京都料亭まつおか',
    invoiceDate: '2026-01-10',
    dueDate: '2026-02-10',
    totalAmount: 920000,
    paidAmount: 920000,
    remainingAmount: 0,
    status: 'sent',
  },
  {
    id: '6',
    invoiceNumber: 'INV-2026-0048',
    customerName: '新世界フーズ株式会社',
    invoiceDate: '2026-02-10',
    dueDate: '2026-03-10',
    totalAmount: 280000,
    paidAmount: 0,
    remainingAmount: 280000,
    status: 'sent',
  },
  {
    id: '7',
    invoiceNumber: 'INV-2025-0198',
    customerName: '有限会社堺水産市場',
    invoiceDate: '2025-12-20',
    dueDate: '2026-01-20',
    totalAmount: 540000,
    paidAmount: 200000,
    remainingAmount: 340000,
    status: 'overdue',
  },
  {
    id: '8',
    invoiceNumber: 'INV-2026-0050',
    customerName: '株式会社神戸ベイシェフ',
    invoiceDate: '2026-02-15',
    dueDate: '2026-03-15',
    totalAmount: 640000,
    paidAmount: 0,
    remainingAmount: 640000,
    status: 'sent',
  },
];

// ---------- 最近の受注 ----------

export const mockRecentOrders: RecentOrder[] = [
  {
    id: '142',
    orderNumber: 'ORD-2026-0142',
    customerName: '株式会社大阪グランドホテル',
    totalAmount: 385000,
    status: 'pending',
    orderDate: '2026-02-28',
    createdAt: '2026-02-28T09:15:00.000Z',
  },
  {
    id: '141',
    orderNumber: 'ORD-2026-0141',
    customerName: '天満屋フードサービス株式会社',
    totalAmount: 210000,
    status: 'confirmed',
    orderDate: '2026-02-27',
    createdAt: '2026-02-27T14:30:00.000Z',
  },
  {
    id: '140',
    orderNumber: 'ORD-2026-0140',
    customerName: '株式会社なにわ食品',
    totalAmount: 540000,
    status: 'in_production',
    orderDate: '2026-02-26',
    createdAt: '2026-02-26T11:00:00.000Z',
  },
  {
    id: '139',
    orderNumber: 'ORD-2026-0139',
    customerName: '南海ケータリング株式会社',
    totalAmount: 175000,
    status: 'ready',
    orderDate: '2026-02-25',
    createdAt: '2026-02-25T16:45:00.000Z',
  },
  {
    id: '138',
    orderNumber: 'ORD-2026-0138',
    customerName: '株式会社京都料亭まつおか',
    totalAmount: 620000,
    status: 'delivered',
    orderDate: '2026-02-24',
    createdAt: '2026-02-24T10:20:00.000Z',
  },
];

// ---------- ステータス分布 ----------

export const mockOrderStatusDistribution: OrderStatusCount[] = [
  { status: 'completed', count: 98 },
  { status: 'delivered', count: 15 },
  { status: 'in_production', count: 10 },
  { status: 'confirmed', count: 8 },
  { status: 'pending', count: 5 },
  { status: 'ready', count: 3 },
  { status: 'cancelled', count: 3 },
];

// ---------- レスポンス ----------

export const mockDashboardSummaryResponse: {
  summary: DashboardSummary;
  recentOrders: RecentOrder[];
  statusDistribution: OrderStatusCount[];
} = {
  summary: mockDashboardSummary,
  recentOrders: mockRecentOrders,
  statusDistribution: mockOrderStatusDistribution,
};

export const mockDashboardSalesResponse: DashboardSalesResponse = {
  daily: mockDailySales,
  monthly: mockMonthlySales,
};

export const mockDashboardRankingsResponse: DashboardRankingsResponse = {
  customers: mockTopCustomers,
  products: mockTopProducts,
};

export const mockDashboardReceivablesResponse: { receivables: Receivable[] } = {
  receivables: mockReceivables,
};
