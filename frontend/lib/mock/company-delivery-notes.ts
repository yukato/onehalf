import type { DeliveryNote, DeliveryNoteItem, DeliveryNotesResponse } from '@/types';

// ============================================================
// DN-2026-0025: 天満屋フードサービス → 冷蔵庫納品
// ============================================================
const dnItems25: DeliveryNoteItem[] = [
  { id: 'd-101', orderItemId: '3', sortOrder: 1, productId: '2', productCode: 'P002', productName: '業務用冷蔵庫 縦型4ドア', quantity: 1, unit: '台', unitPrice: 360000, taxRate: 10, amount: 360000, notes: '寸法: W1,490×D800×H1,950' },
];

// ============================================================
// DN-2026-0024: なにわ食品 → ガスコンロ・吊戸棚
// ============================================================
const dnItems24: DeliveryNoteItem[] = [
  { id: 'd-201', orderItemId: '4', sortOrder: 1, productId: '3', productCode: 'P003', productName: 'ガスコンロ 5口 都市ガス', quantity: 2, unit: '台', unitPrice: 125000, taxRate: 10, amount: 250000, notes: '都市ガス13A対応　寸法: W1,200×D750×H850' },
  { id: 'd-202', orderItemId: '5', sortOrder: 2, productId: '6', productCode: 'P006', productName: '吊戸棚 ステンレス 1500mm', quantity: 3, unit: '台', unitPrice: 42000, taxRate: 10, amount: 126000, notes: null },
];

// ============================================================
// DN-2026-0023: 京都料亭まつおか → 食器洗浄機
// ============================================================
const dnItems23: DeliveryNoteItem[] = [
  { id: 'd-301', orderItemId: '8', sortOrder: 1, productId: '4', productCode: 'P004', productName: '食器洗浄機 アンダーカウンター', quantity: 1, unit: '台', unitPrice: 320000, taxRate: 10, amount: 320000, notes: 'ブースター付き　寸法: W600×D600×H850' },
];

// ============================================================
// DN-2026-0022: 大阪グランドホテル → 宴会場厨房 第1回納品
// ============================================================
const dnItems22: DeliveryNoteItem[] = [
  { id: 'd-401', orderItemId: null, sortOrder: 1, productId: null, productCode: null, productName: '冷蔵庫 縦型6ドア', quantity: 1, unit: '台', unitPrice: 1680000, taxRate: 10, amount: 1680000, notes: '寸法: W1,790×D800×H1,950' },
  { id: 'd-402', orderItemId: null, sortOrder: 2, productId: null, productCode: null, productName: '冷凍庫 縦型2ドア（左開仕様）', quantity: 1, unit: '台', unitPrice: 1137000, taxRate: 10, amount: 1137000, notes: '寸法: W610×D800×H1,950' },
  { id: 'd-403', orderItemId: null, sortOrder: 3, productId: null, productCode: null, productName: 'スチームコンベクションオーブン（2/3サイズ6枚収納）', quantity: 1, unit: '台', unitPrice: 1946000, taxRate: 10, amount: 1946000, notes: '寸法: W655×D621×H595' },
  { id: 'd-404', orderItemId: null, sortOrder: 4, productId: null, productCode: null, productName: 'スチコン専用架台 片側ホテルパン差し付', quantity: 1, unit: '台', unitPrice: 226000, taxRate: 10, amount: 226000, notes: '寸法: W700×D530×H850' },
];

// ============================================================
// DN-2026-0021: 大阪グランドホテル → 宴会場厨房 第2回納品
// ============================================================
const dnItems21: DeliveryNoteItem[] = [
  { id: 'd-501', orderItemId: null, sortOrder: 1, productId: null, productCode: null, productName: 'ガステーブル BG付 H850仕様', quantity: 1, unit: '台', unitPrice: 364000, taxRate: 10, amount: 364000, notes: '寸法: W1,200×D750×H850' },
  { id: 'd-502', orderItemId: null, sortOrder: 2, productId: null, productCode: null, productName: 'ガスローレンジ', quantity: 1, unit: '台', unitPrice: 203000, taxRate: 10, amount: 203000, notes: '寸法: W600×D750×H450' },
  { id: 'd-503', orderItemId: null, sortOrder: 3, productId: null, productCode: null, productName: '二槽シンク BG付', quantity: 1, unit: '台', unitPrice: 130800, taxRate: 10, amount: 130800, notes: '寸法: W1,500×D600×H850' },
  { id: 'd-504', orderItemId: null, sortOrder: 4, productId: null, productCode: null, productName: 'ボックスタイプ洗浄機', quantity: 1, unit: '台', unitPrice: 1326000, taxRate: 10, amount: 1326000, notes: '寸法: W600×D600×H1,277' },
  { id: 'd-505', orderItemId: null, sortOrder: 5, productId: null, productCode: null, productName: '1槽ソイルドテーブル（ダスト缶付）', quantity: 1, unit: '台', unitPrice: 264000, taxRate: 10, amount: 264000, notes: '寸法: W1,500×D650×H850' },
];

// ============================================================
// DN-2026-0020: 南海ケータリング → ガス機器更新
// ============================================================
const dnItems20: DeliveryNoteItem[] = [
  { id: 'd-601', orderItemId: null, sortOrder: 1, productId: null, productCode: null, productName: 'ガステーブル BG付 H850仕様', quantity: 1, unit: '台', unitPrice: 364000, taxRate: 10, amount: 364000, notes: '寸法: W1,200×D750×H850' },
  { id: 'd-602', orderItemId: null, sortOrder: 2, productId: null, productCode: null, productName: 'ガスローレンジ', quantity: 1, unit: '台', unitPrice: 203000, taxRate: 10, amount: 203000, notes: '寸法: W600×D750×H450' },
  { id: 'd-603', orderItemId: null, sortOrder: 3, productId: null, productCode: null, productName: 'フライヤー（都市ガス13A）', quantity: 1, unit: '台', unitPrice: 295000, taxRate: 10, amount: 295000, notes: '寸法: W350×D600×H850　油量13L' },
  { id: 'd-604', orderItemId: null, sortOrder: 4, productId: null, productCode: null, productName: 'コールドテーブル H850仕様', quantity: 1, unit: '台', unitPrice: 88600, taxRate: 10, amount: 88600, notes: '寸法: W1,200×D600×H850' },
];

// ============================================================
// DN-2026-0019: 新世界フーズ → 小物一括納品
// ============================================================
const dnItems19: DeliveryNoteItem[] = [
  { id: 'd-701', orderItemId: '9', sortOrder: 1, productId: '7', productCode: 'P007', productName: 'フードカッター FC-200', quantity: 2, unit: '台', unitPrice: 68000, taxRate: 10, amount: 136000, notes: null },
  { id: 'd-702', orderItemId: '10', sortOrder: 2, productId: null, productCode: 'P010', productName: 'まな板 業務用 900x450mm', quantity: 5, unit: '枚', unitPrice: 4800, taxRate: 10, amount: 24000, notes: null },
];

// ============================================================
// DN-2026-0018: 神戸ベイシェフ → ドリンクバー設備
// ============================================================
const dnItems18: DeliveryNoteItem[] = [
  { id: 'd-801', orderItemId: null, sortOrder: 1, productId: null, productCode: null, productName: 'コールドテーブル（センターフリー） H850仕様', quantity: 1, unit: '台', unitPrice: 835000, taxRate: 10, amount: 835000, notes: '寸法: W1,200×D600×H850' },
  { id: 'd-802', orderItemId: null, sortOrder: 2, productId: null, productCode: null, productName: '冷蔵ショーケース', quantity: 1, unit: '台', unitPrice: 433000, taxRate: 10, amount: 433000, notes: '寸法: W900×D600×H800' },
  { id: 'd-803', orderItemId: null, sortOrder: 3, productId: null, productCode: null, productName: '製氷機 日産25kg', quantity: 1, unit: '台', unitPrice: 500000, taxRate: 10, amount: 500000, notes: '寸法: W398×D450×H800' },
  { id: 'd-804', orderItemId: null, sortOrder: 4, productId: null, productCode: null, productName: 'ワインセラー 38本収納', quantity: 1, unit: '台', unitPrice: 150000, taxRate: 10, amount: 150000, notes: '寸法: W380×D527×H1,160' },
  { id: 'd-805', orderItemId: null, sortOrder: 5, productId: null, productCode: null, productName: 'コーヒーメーカー', quantity: 1, unit: '台', unitPrice: 109560, taxRate: 10, amount: 109560, notes: '寸法: W210×D385×H455' },
];

// ============================================================
// DN-2026-0017: 泉州スナックフーズ → コンベヤー第1回
// ============================================================
const dnItems17: DeliveryNoteItem[] = [
  { id: 'd-901', orderItemId: null, sortOrder: 1, productId: '90', productCode: 'CV01', productName: 'フライ後搬送コンベヤー', quantity: 1, unit: '台', unitPrice: 3927000, taxRate: 10, amount: 3927000, notes: 'ベルト巾600W×長さ5130L×搬送面高さ 入口H1000→出口H1200' },
  { id: 'd-902', orderItemId: null, sortOrder: 2, productId: '91', productCode: 'CV02', productName: 'フライ後中継コンベヤー', quantity: 1, unit: '台', unitPrice: 2640000, taxRate: 10, amount: 2640000, notes: 'ベルト巾600W×長さ2250L×搬送面高さH1000' },
];

// ============================================================
// 納品書一覧
// ============================================================

const sum = (items: DeliveryNoteItem[]) => items.reduce((s, i) => s + i.amount, 0);

export const mockDeliveryNotes: DeliveryNote[] = [
  {
    id: '25',
    deliveryNumber: 'DN-2026-0025',
    orderId: '141',
    order: { id: '141', orderNumber: 'ORD-2026-0141', salesNumber: 'S-2026-0089' },
    customerId: '2',
    customer: { id: '2', name: '天満屋フードサービス株式会社', code: 'C002' },
    deliveryDate: '2026-03-10',
    subtotal: sum(dnItems25),
    taxAmount: Math.floor(sum(dnItems25) * 0.1),
    totalAmount: sum(dnItems25) + Math.floor(sum(dnItems25) * 0.1),
    notes: null,
    status: 'issued',
    items: dnItems25,
    createdByName: '八木厨房 管理者',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: '24',
    deliveryNumber: 'DN-2026-0024',
    orderId: '140',
    order: { id: '140', orderNumber: 'ORD-2026-0140', salesNumber: 'S-2026-0088' },
    customerId: '3',
    customer: { id: '3', name: '株式会社なにわ食品', code: 'C003' },
    deliveryDate: '2026-03-05',
    subtotal: sum(dnItems24),
    taxAmount: Math.floor(sum(dnItems24) * 0.1),
    totalAmount: sum(dnItems24) + Math.floor(sum(dnItems24) * 0.1),
    notes: '厨房改装工事完了後に設置',
    status: 'delivered',
    items: dnItems24,
    createdByName: '岩田 隆宏',
    createdAt: '2026-02-28T14:00:00.000Z',
    updatedAt: '2026-03-05T16:00:00.000Z',
  },
  {
    id: '23',
    deliveryNumber: 'DN-2026-0023',
    orderId: '138',
    order: { id: '138', orderNumber: 'ORD-2026-0138', salesNumber: 'S-2026-0085' },
    customerId: '5',
    customer: { id: '5', name: '株式会社京都料亭まつおか', code: 'C005' },
    deliveryDate: '2026-03-01',
    subtotal: sum(dnItems23),
    taxAmount: Math.floor(sum(dnItems23) * 0.1),
    totalAmount: sum(dnItems23) + Math.floor(sum(dnItems23) * 0.1),
    notes: null,
    status: 'confirmed',
    items: dnItems23,
    createdByName: '八木厨房 管理者',
    createdAt: '2026-02-26T09:00:00.000Z',
    updatedAt: '2026-03-01T15:00:00.000Z',
  },
  {
    id: '22',
    deliveryNumber: 'DN-2026-0022',
    orderId: '142',
    order: { id: '142', orderNumber: 'ORD-2026-0142', salesNumber: null },
    customerId: '1',
    customer: { id: '1', name: '株式会社大阪グランドホテル', code: 'C001' },
    deliveryDate: '2026-02-28',
    subtotal: sum(dnItems22),
    taxAmount: Math.floor(sum(dnItems22) * 0.1),
    totalAmount: sum(dnItems22) + Math.floor(sum(dnItems22) * 0.1),
    notes: '宴会場厨房 第1回納品（冷蔵・冷凍・スチコン）\n搬入口: B棟側エレベーター使用',
    status: 'delivered',
    items: dnItems22,
    createdByName: '岩田 隆宏',
    createdAt: '2026-02-20T09:00:00.000Z',
    updatedAt: '2026-02-28T17:00:00.000Z',
  },
  {
    id: '21',
    deliveryNumber: 'DN-2026-0021',
    orderId: '142',
    order: { id: '142', orderNumber: 'ORD-2026-0142', salesNumber: null },
    customerId: '1',
    customer: { id: '1', name: '株式会社大阪グランドホテル', code: 'C001' },
    deliveryDate: '2026-03-08',
    subtotal: sum(dnItems21),
    taxAmount: Math.floor(sum(dnItems21) * 0.1),
    totalAmount: sum(dnItems21) + Math.floor(sum(dnItems21) * 0.1),
    notes: '宴会場厨房 第2回納品（調理・洗浄機器）',
    status: 'issued',
    items: dnItems21,
    createdByName: '岩田 隆宏',
    createdAt: '2026-03-01T09:00:00.000Z',
    updatedAt: '2026-03-01T09:00:00.000Z',
  },
  {
    id: '20',
    deliveryNumber: 'DN-2026-0020',
    orderId: '139',
    order: { id: '139', orderNumber: 'ORD-2026-0139', salesNumber: null },
    customerId: '4',
    customer: { id: '4', name: '南海ケータリング株式会社', code: 'C004' },
    deliveryDate: '2026-02-25',
    subtotal: sum(dnItems20),
    taxAmount: Math.floor(sum(dnItems20) * 0.1),
    totalAmount: sum(dnItems20) + Math.floor(sum(dnItems20) * 0.1),
    notes: '調理室ガス機器更新分',
    status: 'confirmed',
    items: dnItems20,
    createdByName: '八木厨房 管理者',
    createdAt: '2026-02-18T14:00:00.000Z',
    updatedAt: '2026-02-25T16:00:00.000Z',
  },
  {
    id: '19',
    deliveryNumber: 'DN-2026-0019',
    orderId: '137',
    order: { id: '137', orderNumber: 'ORD-2026-0137', salesNumber: 'S-2026-0084' },
    customerId: '6',
    customer: { id: '6', name: '新世界フーズ株式会社', code: 'C006' },
    deliveryDate: '2026-02-22',
    subtotal: sum(dnItems19),
    taxAmount: Math.floor(sum(dnItems19) * 0.1),
    totalAmount: sum(dnItems19) + Math.floor(sum(dnItems19) * 0.1),
    notes: null,
    status: 'confirmed',
    items: dnItems19,
    createdByName: '八木厨房 管理者',
    createdAt: '2026-02-15T11:00:00.000Z',
    updatedAt: '2026-02-22T15:00:00.000Z',
  },
  {
    id: '18',
    deliveryNumber: 'DN-2026-0018',
    orderId: '136',
    order: { id: '136', orderNumber: 'ORD-2026-0136', salesNumber: 'S-2026-0083' },
    customerId: '8',
    customer: { id: '8', name: '株式会社神戸ベイシェフ', code: 'C008' },
    deliveryDate: '2026-02-20',
    subtotal: sum(dnItems18),
    taxAmount: Math.floor(sum(dnItems18) * 0.1),
    totalAmount: sum(dnItems18) + Math.floor(sum(dnItems18) * 0.1),
    notes: '1Fカフェエリア ドリンクバー設備一式',
    status: 'delivered',
    items: dnItems18,
    createdByName: '岩田 隆宏',
    createdAt: '2026-02-10T10:00:00.000Z',
    updatedAt: '2026-02-20T17:00:00.000Z',
  },
  {
    id: '17',
    deliveryNumber: 'DN-2026-0017',
    orderId: '135',
    order: { id: '135', orderNumber: 'ORD-2026-0135', salesNumber: 'S-2026-0080' },
    customerId: '13',
    customer: { id: '13', name: '株式会社泉州スナックフーズ', code: 'C013' },
    deliveryDate: '2026-02-15',
    subtotal: sum(dnItems17),
    taxAmount: Math.floor(sum(dnItems17) * 0.1),
    totalAmount: sum(dnItems17) + Math.floor(sum(dnItems17) * 0.1),
    notes: 'コンベヤー第1回納品（CV01, CV02）\n残りは3月中旬予定',
    status: 'delivered',
    items: dnItems17,
    createdByName: '岩田 隆宏',
    createdAt: '2026-02-05T09:00:00.000Z',
    updatedAt: '2026-02-15T18:00:00.000Z',
  },
];

export const mockDeliveryNotesResponse: DeliveryNotesResponse = {
  deliveryNotes: mockDeliveryNotes.map(({ items: _items, ...rest }) => rest),
  total: mockDeliveryNotes.length,
};
