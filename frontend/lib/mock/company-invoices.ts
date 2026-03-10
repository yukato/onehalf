import type { Invoice, InvoiceItem, Payment, InvoicesResponse } from '@/types';

// ============================================================
// INV-2026-0055: なにわ食品 → ガスコンロ・吊戸棚（DN-0024分）
// ============================================================
const invItems55: InvoiceItem[] = [
  { id: 'inv-101', deliveryNoteId: '24', orderId: '140', sortOrder: 1, description: 'ガスコンロ 5口 都市ガス', quantity: 2, unit: '台', unitPrice: 125000, taxRate: 10, amount: 250000, notes: '都市ガス13A対応' },
  { id: 'inv-102', deliveryNoteId: '24', orderId: '140', sortOrder: 2, description: '吊戸棚 ステンレス 1500mm', quantity: 3, unit: '台', unitPrice: 42000, taxRate: 10, amount: 126000, notes: null },
];

// ============================================================
// INV-2026-0054: 京都料亭まつおか → 食器洗浄機（DN-0023分）
// ============================================================
const invItems54: InvoiceItem[] = [
  { id: 'inv-201', deliveryNoteId: '23', orderId: '138', sortOrder: 1, description: '食器洗浄機 アンダーカウンター（ブースター付き）', quantity: 1, unit: '台', unitPrice: 320000, taxRate: 10, amount: 320000, notes: null },
];

const payments54: Payment[] = [
  { id: 'pay-1', invoiceId: '54', paymentDate: '2026-03-05', amount: 352000, paymentMethod: '銀行振込', reference: 'みずほ銀行 振込No.20260305-001', notes: null, createdByName: '八木厨房 管理者', createdAt: '2026-03-05T10:00:00.000Z' },
];

// ============================================================
// INV-2026-0053: 天満屋フードサービス → 冷蔵庫（DN-0025分）
// ============================================================
const invItems53: InvoiceItem[] = [
  { id: 'inv-301', deliveryNoteId: '25', orderId: '141', sortOrder: 1, description: '業務用冷蔵庫 縦型4ドア', quantity: 1, unit: '台', unitPrice: 360000, taxRate: 10, amount: 360000, notes: '寸法: W1,490×D800×H1,950' },
];

// ============================================================
// INV-2026-0052: 大阪グランドホテル → 宴会場厨房 第1回（DN-0022分）
// ============================================================
const invItems52: InvoiceItem[] = [
  { id: 'inv-401', deliveryNoteId: '22', orderId: '142', sortOrder: 1, description: '冷蔵庫 縦型6ドア', quantity: 1, unit: '台', unitPrice: 1680000, taxRate: 10, amount: 1680000, notes: null },
  { id: 'inv-402', deliveryNoteId: '22', orderId: '142', sortOrder: 2, description: '冷凍庫 縦型2ドア（左開仕様）', quantity: 1, unit: '台', unitPrice: 1137000, taxRate: 10, amount: 1137000, notes: null },
  { id: 'inv-403', deliveryNoteId: '22', orderId: '142', sortOrder: 3, description: 'スチームコンベクションオーブン（2/3サイズ6枚収納）', quantity: 1, unit: '台', unitPrice: 1946000, taxRate: 10, amount: 1946000, notes: null },
  { id: 'inv-404', deliveryNoteId: '22', orderId: '142', sortOrder: 4, description: 'スチコン専用架台 片側ホテルパン差し付', quantity: 1, unit: '台', unitPrice: 226000, taxRate: 10, amount: 226000, notes: null },
];

const payments52: Payment[] = [
  { id: 'pay-2', invoiceId: '52', paymentDate: '2026-03-08', amount: 3000000, paymentMethod: '銀行振込', reference: '三井住友銀行 振込No.20260308-002', notes: '一部入金', createdByName: '八木厨房 管理者', createdAt: '2026-03-08T14:00:00.000Z' },
];

// ============================================================
// INV-2026-0051: 南海ケータリング → ガス機器更新（DN-0020分）
// ============================================================
const invItems51: InvoiceItem[] = [
  { id: 'inv-501', deliveryNoteId: '20', orderId: '139', sortOrder: 1, description: 'ガステーブル BG付 H850仕様', quantity: 1, unit: '台', unitPrice: 364000, taxRate: 10, amount: 364000, notes: null },
  { id: 'inv-502', deliveryNoteId: '20', orderId: '139', sortOrder: 2, description: 'ガスローレンジ', quantity: 1, unit: '台', unitPrice: 203000, taxRate: 10, amount: 203000, notes: null },
  { id: 'inv-503', deliveryNoteId: '20', orderId: '139', sortOrder: 3, description: 'フライヤー（都市ガス13A）', quantity: 1, unit: '台', unitPrice: 295000, taxRate: 10, amount: 295000, notes: null },
  { id: 'inv-504', deliveryNoteId: '20', orderId: '139', sortOrder: 4, description: 'コールドテーブル H850仕様', quantity: 1, unit: '台', unitPrice: 88600, taxRate: 10, amount: 88600, notes: null },
];

const payments51: Payment[] = [
  { id: 'pay-3', invoiceId: '51', paymentDate: '2026-03-01', amount: 1045660, paymentMethod: '銀行振込', reference: null, notes: null, createdByName: '八木厨房 管理者', createdAt: '2026-03-01T09:00:00.000Z' },
];

// ============================================================
// INV-2026-0050: 新世界フーズ → 小物一括（DN-0019分）
// ============================================================
const invItems50: InvoiceItem[] = [
  { id: 'inv-601', deliveryNoteId: '19', orderId: '137', sortOrder: 1, description: 'フードカッター FC-200', quantity: 2, unit: '台', unitPrice: 68000, taxRate: 10, amount: 136000, notes: null },
  { id: 'inv-602', deliveryNoteId: '19', orderId: '137', sortOrder: 2, description: 'まな板 業務用 900x450mm', quantity: 5, unit: '枚', unitPrice: 4800, taxRate: 10, amount: 24000, notes: null },
];

const payments50: Payment[] = [
  { id: 'pay-4', invoiceId: '50', paymentDate: '2026-02-28', amount: 176000, paymentMethod: '銀行振込', reference: null, notes: null, createdByName: '八木厨房 管理者', createdAt: '2026-02-28T15:00:00.000Z' },
];

// ============================================================
// INV-2026-0049: 神戸ベイシェフ → ドリンクバー設備（DN-0018分）
// ============================================================
const invItems49: InvoiceItem[] = [
  { id: 'inv-701', deliveryNoteId: '18', orderId: '136', sortOrder: 1, description: 'コールドテーブル（センターフリー） H850仕様', quantity: 1, unit: '台', unitPrice: 835000, taxRate: 10, amount: 835000, notes: null },
  { id: 'inv-702', deliveryNoteId: '18', orderId: '136', sortOrder: 2, description: '冷蔵ショーケース', quantity: 1, unit: '台', unitPrice: 433000, taxRate: 10, amount: 433000, notes: null },
  { id: 'inv-703', deliveryNoteId: '18', orderId: '136', sortOrder: 3, description: '製氷機 日産25kg', quantity: 1, unit: '台', unitPrice: 500000, taxRate: 10, amount: 500000, notes: null },
  { id: 'inv-704', deliveryNoteId: '18', orderId: '136', sortOrder: 4, description: 'ワインセラー 38本収納', quantity: 1, unit: '台', unitPrice: 150000, taxRate: 10, amount: 150000, notes: null },
  { id: 'inv-705', deliveryNoteId: '18', orderId: '136', sortOrder: 5, description: 'コーヒーメーカー', quantity: 1, unit: '台', unitPrice: 109560, taxRate: 10, amount: 109560, notes: null },
];

// ============================================================
// INV-2026-0048: 泉州スナックフーズ → コンベヤー第1回（DN-0017分）
// ============================================================
const invItems48: InvoiceItem[] = [
  { id: 'inv-801', deliveryNoteId: '17', orderId: '135', sortOrder: 1, description: 'フライ後搬送コンベヤー', quantity: 1, unit: '台', unitPrice: 3927000, taxRate: 10, amount: 3927000, notes: 'CV01' },
  { id: 'inv-802', deliveryNoteId: '17', orderId: '135', sortOrder: 2, description: 'フライ後中継コンベヤー', quantity: 1, unit: '台', unitPrice: 2640000, taxRate: 10, amount: 2640000, notes: 'CV02' },
];

// ============================================================
// 請求書一覧
// ============================================================

const sum = (items: InvoiceItem[]) => items.reduce((s, i) => s + i.amount, 0);

export const mockInvoices: Invoice[] = [
  {
    id: '55',
    invoiceNumber: 'INV-2026-0055',
    customerId: '3',
    customer: { id: '3', name: '株式会社なにわ食品', code: 'C003' },
    billingPeriodStart: '2026-02-01',
    billingPeriodEnd: '2026-02-28',
    invoiceDate: '2026-03-01',
    dueDate: '2026-03-31',
    subtotal: sum(invItems55),
    taxAmount: Math.floor(sum(invItems55) * 0.1),
    totalAmount: sum(invItems55) + Math.floor(sum(invItems55) * 0.1),
    paidAmount: 0,
    notes: null,
    status: 'sent',
    items: invItems55,
    payments: [],
    createdByName: '八木厨房 管理者',
    createdAt: '2026-03-01T11:00:00.000Z',
    updatedAt: '2026-03-01T11:00:00.000Z',
  },
  {
    id: '54',
    invoiceNumber: 'INV-2026-0054',
    customerId: '5',
    customer: { id: '5', name: '株式会社京都料亭まつおか', code: 'C005' },
    billingPeriodStart: null,
    billingPeriodEnd: null,
    invoiceDate: '2026-02-28',
    dueDate: '2026-03-28',
    subtotal: sum(invItems54),
    taxAmount: Math.floor(sum(invItems54) * 0.1),
    totalAmount: sum(invItems54) + Math.floor(sum(invItems54) * 0.1),
    paidAmount: 352000,
    notes: null,
    status: 'paid',
    items: invItems54,
    payments: payments54,
    createdByName: '八木厨房 管理者',
    createdAt: '2026-02-28T09:00:00.000Z',
    updatedAt: '2026-03-05T10:00:00.000Z',
  },
  {
    id: '53',
    invoiceNumber: 'INV-2026-0053',
    customerId: '2',
    customer: { id: '2', name: '天満屋フードサービス株式会社', code: 'C002' },
    billingPeriodStart: null,
    billingPeriodEnd: null,
    invoiceDate: '2026-02-25',
    dueDate: '2026-03-25',
    subtotal: sum(invItems53),
    taxAmount: Math.floor(sum(invItems53) * 0.1),
    totalAmount: sum(invItems53) + Math.floor(sum(invItems53) * 0.1),
    paidAmount: 0,
    notes: null,
    status: 'issued',
    items: invItems53,
    payments: [],
    createdByName: '岩田 隆宏',
    createdAt: '2026-02-25T15:00:00.000Z',
    updatedAt: '2026-02-25T15:00:00.000Z',
  },
  {
    id: '52',
    invoiceNumber: 'INV-2026-0052',
    customerId: '1',
    customer: { id: '1', name: '株式会社大阪グランドホテル', code: 'C001' },
    billingPeriodStart: null,
    billingPeriodEnd: null,
    invoiceDate: '2026-02-20',
    dueDate: '2026-03-20',
    subtotal: sum(invItems52),
    taxAmount: Math.floor(sum(invItems52) * 0.1),
    totalAmount: sum(invItems52) + Math.floor(sum(invItems52) * 0.1),
    paidAmount: 3000000,
    notes: '宴会場厨房 第1回納品分',
    status: 'partially_paid',
    items: invItems52,
    payments: payments52,
    createdByName: '岩田 隆宏',
    createdAt: '2026-02-20T10:00:00.000Z',
    updatedAt: '2026-03-08T14:00:00.000Z',
  },
  {
    id: '51',
    invoiceNumber: 'INV-2026-0051',
    customerId: '4',
    customer: { id: '4', name: '南海ケータリング株式会社', code: 'C004' },
    billingPeriodStart: null,
    billingPeriodEnd: null,
    invoiceDate: '2026-02-18',
    dueDate: '2026-02-28',
    subtotal: sum(invItems51),
    taxAmount: Math.floor(sum(invItems51) * 0.1),
    totalAmount: sum(invItems51) + Math.floor(sum(invItems51) * 0.1),
    paidAmount: 1045660,
    notes: '調理室ガス機器更新分',
    status: 'paid',
    items: invItems51,
    payments: payments51,
    createdByName: '八木厨房 管理者',
    createdAt: '2026-02-18T14:00:00.000Z',
    updatedAt: '2026-03-01T09:00:00.000Z',
  },
  {
    id: '50',
    invoiceNumber: 'INV-2026-0050',
    customerId: '6',
    customer: { id: '6', name: '新世界フーズ株式会社', code: 'C006' },
    billingPeriodStart: null,
    billingPeriodEnd: null,
    invoiceDate: '2026-02-15',
    dueDate: '2026-02-28',
    subtotal: sum(invItems50),
    taxAmount: Math.floor(sum(invItems50) * 0.1),
    totalAmount: sum(invItems50) + Math.floor(sum(invItems50) * 0.1),
    paidAmount: 176000,
    notes: null,
    status: 'paid',
    items: invItems50,
    payments: payments50,
    createdByName: '八木厨房 管理者',
    createdAt: '2026-02-15T11:00:00.000Z',
    updatedAt: '2026-02-28T15:00:00.000Z',
  },
  {
    id: '49',
    invoiceNumber: 'INV-2026-0049',
    customerId: '8',
    customer: { id: '8', name: '株式会社神戸ベイシェフ', code: 'C008' },
    billingPeriodStart: null,
    billingPeriodEnd: null,
    invoiceDate: '2026-02-10',
    dueDate: '2026-03-10',
    subtotal: sum(invItems49),
    taxAmount: Math.floor(sum(invItems49) * 0.1),
    totalAmount: sum(invItems49) + Math.floor(sum(invItems49) * 0.1),
    paidAmount: 0,
    notes: 'ドリンクバー設備一式',
    status: 'overdue',
    items: invItems49,
    payments: [],
    createdByName: '岩田 隆宏',
    createdAt: '2026-02-10T10:00:00.000Z',
    updatedAt: '2026-02-10T10:00:00.000Z',
  },
  {
    id: '48',
    invoiceNumber: 'INV-2026-0048',
    customerId: '13',
    customer: { id: '13', name: '株式会社泉州スナックフーズ', code: 'C013' },
    billingPeriodStart: null,
    billingPeriodEnd: null,
    invoiceDate: '2026-02-05',
    dueDate: '2026-03-05',
    subtotal: sum(invItems48),
    taxAmount: Math.floor(sum(invItems48) * 0.1),
    totalAmount: sum(invItems48) + Math.floor(sum(invItems48) * 0.1),
    paidAmount: 0,
    notes: 'コンベヤー第1回納品分（CV01, CV02）',
    status: 'sent',
    items: invItems48,
    payments: [],
    createdByName: '岩田 隆宏',
    createdAt: '2026-02-05T09:00:00.000Z',
    updatedAt: '2026-02-06T10:00:00.000Z',
  },
];

export const mockInvoicesResponse: InvoicesResponse = {
  invoices: mockInvoices.map(({ items: _items, payments: _payments, ...rest }) => rest),
  total: mockInvoices.length,
};
