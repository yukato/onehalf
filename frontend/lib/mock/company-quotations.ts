import type { Quotation, QuotationItem, QuotationsResponse } from '@/types';

// デフォルトのcostPrice/costPartsを付与するヘルパー
type RawItem = Omit<QuotationItem, 'costPrice' | 'costParts'> & { costPrice?: number; costParts?: QuotationItem['costParts'] };
const withCostDefaults = (items: RawItem[]): QuotationItem[] =>
  items.map(item => ({ costPrice: 0, costParts: [], ...item }));

// ============================================================
// QT-2026-0021: 大阪グランドホテル → 宴会場厨房機器一式
// ============================================================
const qtItems21: QuotationItem[] = withCostDefaults([
  { id: '101', sortOrder: 1, productId: null, productCode: null, productName: '冷蔵庫 縦型6ドア', quantity: 1, unit: '台', unitPrice: 1680000, costPrice: 1050000, costParts: [{ name: '本体', unitPrice: 920000 }, { name: '送料', unitPrice: 130000 }], taxRate: 10, amount: 1680000, notes: '寸法: W1,790×D800×H1,950' },
  { id: '102', sortOrder: 2, productId: null, productCode: null, productName: '冷凍庫 縦型2ドア（左開仕様）', quantity: 1, unit: '台', unitPrice: 1137000, costPrice: 710000, costParts: [{ name: '本体', unitPrice: 630000 }, { name: '送料', unitPrice: 80000 }], taxRate: 10, amount: 1137000, notes: '寸法: W610×D800×H1,950' },
  { id: '103', sortOrder: 3, productId: null, productCode: null, productName: 'スチームコンベクションオーブン（2/3サイズ6枚収納）', quantity: 1, unit: '台', unitPrice: 1946000, costPrice: 1250000, costParts: [{ name: '本体', unitPrice: 1100000 }, { name: '付属品', unitPrice: 80000 }, { name: '送料', unitPrice: 70000 }], taxRate: 10, amount: 1946000, notes: '寸法: W655×D621×H595' },
  { id: '104', sortOrder: 4, productId: null, productCode: null, productName: 'スチコン専用架台 片側ホテルパン差し付', quantity: 1, unit: '台', unitPrice: 226000, taxRate: 10, amount: 226000, notes: '寸法: W700×D530×H850' },
  { id: '105', sortOrder: 5, productId: null, productCode: null, productName: 'ガステーブル BG付 H850仕様', quantity: 1, unit: '台', unitPrice: 364000, taxRate: 10, amount: 364000, notes: '寸法: W1,200×D750×H850' },
  { id: '106', sortOrder: 6, productId: null, productCode: null, productName: 'ガスローレンジ', quantity: 1, unit: '台', unitPrice: 203000, taxRate: 10, amount: 203000, notes: '寸法: W600×D750×H450' },
  { id: '107', sortOrder: 7, productId: null, productCode: null, productName: '電気サラマンダー（3相-200V）', quantity: 1, unit: '台', unitPrice: 516000, taxRate: 10, amount: 516000, notes: '寸法: W600×D455×H530' },
  { id: '108', sortOrder: 8, productId: null, productCode: null, productName: '架台', quantity: 1, unit: '台', unitPrice: 41500, taxRate: 10, amount: 41500, notes: '寸法: W600×D450×H450' },
  { id: '109', sortOrder: 9, productId: null, productCode: null, productName: 'IHジャー炊飯器', quantity: 1, unit: '台', unitPrice: 200000, taxRate: 10, amount: 200000, notes: '寸法: W502×D429×H410' },
  { id: '110', sortOrder: 10, productId: null, productCode: null, productName: '炊飯カート', quantity: 1, unit: '台', unitPrice: 32500, taxRate: 10, amount: 32500, notes: '寸法: W450×D450×H95' },
  { id: '111', sortOrder: 11, productId: null, productCode: null, productName: '二槽シンク BG付', quantity: 1, unit: '台', unitPrice: 130800, taxRate: 10, amount: 130800, notes: '寸法: W1,500×D600×H850' },
  { id: '112', sortOrder: 12, productId: null, productCode: null, productName: '上棚', quantity: 1, unit: '台', unitPrice: 30800, taxRate: 10, amount: 30800, notes: '寸法: W1,500×D300×1段' },
  { id: '113', sortOrder: 13, productId: null, productCode: null, productName: 'コールドテーブル（センターフリー） H850仕様', quantity: 2, unit: '台', unitPrice: 88600, taxRate: 10, amount: 177200, notes: '寸法: W1,200×D600×H850' },
  { id: '114', sortOrder: 14, productId: null, productCode: null, productName: '吊戸棚W/上棚', quantity: 2, unit: '台', unitPrice: 88600, taxRate: 10, amount: 177200, notes: '寸法: W1,200×D350×H736（1段）' },
  { id: '115', sortOrder: 15, productId: null, productCode: null, productName: '台下戸棚 下部両面戸棚', quantity: 1, unit: '台', unitPrice: 252000, taxRate: 10, amount: 252000, notes: '寸法: W1,580×D750×H850' },
  { id: '116', sortOrder: 16, productId: null, productCode: null, productName: '台下戸棚 下部片面スイング扉', quantity: 1, unit: '台', unitPrice: 136000, taxRate: 10, amount: 136000, notes: '寸法: W650×D750×H850' },
  { id: '117', sortOrder: 17, productId: null, productCode: null, productName: '移動台 キャスター径125mm', quantity: 1, unit: '台', unitPrice: 82800, taxRate: 10, amount: 82800, notes: '寸法: W750×D600×H850' },
  { id: '118', sortOrder: 18, productId: null, productCode: null, productName: 'ボックスタイプ洗浄機', quantity: 1, unit: '台', unitPrice: 1326000, taxRate: 10, amount: 1326000, notes: '寸法: W600×D600×H1,277' },
  { id: '119', sortOrder: 19, productId: null, productCode: null, productName: '1槽ソイルドテーブル（ダスト缶付）', quantity: 1, unit: '台', unitPrice: 264000, taxRate: 10, amount: 264000, notes: '寸法: W1,500×D650×H850' },
  { id: '120', sortOrder: 20, productId: null, productCode: null, productName: 'ラックシェルフ', quantity: 1, unit: '台', unitPrice: 42000, taxRate: 10, amount: 42000, notes: '寸法: W1,100×D400×1段' },
  { id: '121', sortOrder: 21, productId: null, productCode: null, productName: 'シェルフ（ベンチ4段）', quantity: 2, unit: '台', unitPrice: 166000, taxRate: 10, amount: 332000, notes: '寸法: W1,215×D620×H1,886' },
  { id: '122', sortOrder: 22, productId: null, productCode: null, productName: '製氷機', quantity: 1, unit: '台', unitPrice: 500000, taxRate: 10, amount: 500000, notes: '寸法: W398×D450×H800　日産25kg' },
  { id: '123', sortOrder: 23, productId: null, productCode: null, productName: '冷蔵ショーケース', quantity: 1, unit: '台', unitPrice: 309000, taxRate: 10, amount: 309000, notes: '寸法: W460×D492×H1,522' },
  { id: '124', sortOrder: 24, productId: null, productCode: null, productName: 'ワインセラー 38本収納', quantity: 1, unit: '台', unitPrice: 150000, taxRate: 10, amount: 150000, notes: '寸法: W380×D527×H1,160' },
  { id: '125', sortOrder: 25, productId: null, productCode: null, productName: 'コーヒーメーカー', quantity: 1, unit: '台', unitPrice: 109560, taxRate: 10, amount: 109560, notes: '寸法: W210×D385×H455' },
  // 工事費
  { id: '126', sortOrder: 26, productId: null, productCode: null, productName: '機器運搬及び現場搬入費', quantity: 1, unit: '式', unitPrice: 480000, taxRate: 10, amount: 480000, notes: null },
  { id: '127', sortOrder: 27, productId: null, productCode: null, productName: '現場据付費及び取付費', quantity: 1, unit: '式', unitPrice: 720000, taxRate: 10, amount: 720000, notes: null },
  { id: '128', sortOrder: 28, productId: null, productCode: null, productName: '試運転調整及び諸経費', quantity: 1, unit: '式', unitPrice: 200000, taxRate: 10, amount: 200000, notes: null },
]);

// ============================================================
// QT-2026-0020: 天満屋フードサービス → セントラルキッチン改修
// ============================================================
const qtItems20: QuotationItem[] = withCostDefaults([
  { id: '201', sortOrder: 1, productId: null, productCode: null, productName: '冷蔵庫 縦型4ドア', quantity: 2, unit: '台', unitPrice: 1465000, taxRate: 10, amount: 2930000, notes: '寸法: W1,490×D800×H1,950' },
  { id: '202', sortOrder: 2, productId: null, productCode: null, productName: '冷凍庫 縦型4ドア', quantity: 1, unit: '台', unitPrice: 1480000, taxRate: 10, amount: 1480000, notes: '寸法: W1,490×D800×H1,950' },
  { id: '203', sortOrder: 3, productId: null, productCode: null, productName: 'スチームコンベクションオーブン（1/1サイズ10枚収納）', quantity: 1, unit: '台', unitPrice: 2850000, taxRate: 10, amount: 2850000, notes: '寸法: W850×D775×H1,020' },
  { id: '204', sortOrder: 4, productId: null, productCode: null, productName: 'スチコン専用架台', quantity: 1, unit: '台', unitPrice: 280000, taxRate: 10, amount: 280000, notes: '寸法: W850×D700×H850' },
  { id: '205', sortOrder: 5, productId: null, productCode: null, productName: 'ガステーブル BG付 H850仕様', quantity: 1, unit: '台', unitPrice: 485000, taxRate: 10, amount: 485000, notes: '寸法: W1,800×D750×H850' },
  { id: '206', sortOrder: 6, productId: null, productCode: null, productName: 'フライヤー（都市ガス13A）', quantity: 1, unit: '台', unitPrice: 385000, taxRate: 10, amount: 385000, notes: '寸法: W450×D600×H850　油量18L' },
  { id: '207', sortOrder: 7, productId: null, productCode: null, productName: 'ゆで麺機（都市ガス13A）', quantity: 1, unit: '台', unitPrice: 320000, taxRate: 10, amount: 320000, notes: '寸法: W450×D600×H850' },
  { id: '208', sortOrder: 8, productId: null, productCode: null, productName: 'コールドテーブル H850仕様', quantity: 2, unit: '台', unitPrice: 125000, taxRate: 10, amount: 250000, notes: '寸法: W1,500×D600×H850' },
  { id: '209', sortOrder: 9, productId: null, productCode: null, productName: '二槽シンク BG付', quantity: 1, unit: '台', unitPrice: 148000, taxRate: 10, amount: 148000, notes: '寸法: W1,500×D750×H850' },
  { id: '210', sortOrder: 10, productId: null, productCode: null, productName: '一槽シンク BG付', quantity: 2, unit: '台', unitPrice: 78000, taxRate: 10, amount: 156000, notes: '寸法: W750×D600×H850' },
  { id: '211', sortOrder: 11, productId: null, productCode: null, productName: 'ステンレス作業台 BG付', quantity: 3, unit: '台', unitPrice: 65000, taxRate: 10, amount: 195000, notes: '寸法: W900×D600×H850' },
  { id: '212', sortOrder: 12, productId: null, productCode: null, productName: 'フライトタイプ洗浄機 電気ブースター内蔵', quantity: 1, unit: '台', unitPrice: 4200000, taxRate: 10, amount: 4200000, notes: '寸法: W680×D2,680×H1,540' },
  { id: '213', sortOrder: 13, productId: null, productCode: null, productName: '1槽ソイルドテーブル（ダスト缶付）', quantity: 1, unit: '台', unitPrice: 295000, taxRate: 10, amount: 295000, notes: '寸法: W1,800×D750×H850' },
  { id: '214', sortOrder: 14, productId: null, productCode: null, productName: 'クリーンテーブル', quantity: 1, unit: '台', unitPrice: 210000, taxRate: 10, amount: 210000, notes: '寸法: W1,500×D750×H850' },
  { id: '215', sortOrder: 15, productId: null, productCode: null, productName: 'シェルフ（ベンチ5段）', quantity: 4, unit: '台', unitPrice: 185000, taxRate: 10, amount: 740000, notes: '寸法: W1,520×D620×H1,886' },
  { id: '216', sortOrder: 16, productId: null, productCode: null, productName: '製氷機 日産55kg', quantity: 1, unit: '台', unitPrice: 680000, taxRate: 10, amount: 680000, notes: '寸法: W630×D500×H800' },
  // 工事費
  { id: '217', sortOrder: 17, productId: null, productCode: null, productName: '機器運搬及び現場搬入費', quantity: 1, unit: '式', unitPrice: 580000, taxRate: 10, amount: 580000, notes: null },
  { id: '218', sortOrder: 18, productId: null, productCode: null, productName: '現場据付費及び取付費', quantity: 1, unit: '式', unitPrice: 850000, taxRate: 10, amount: 850000, notes: null },
  { id: '219', sortOrder: 19, productId: null, productCode: null, productName: '既存機器撤去処分費', quantity: 1, unit: '式', unitPrice: 450000, taxRate: 10, amount: 450000, notes: null },
  { id: '220', sortOrder: 20, productId: null, productCode: null, productName: '試運転調整及び諸経費', quantity: 1, unit: '式', unitPrice: 220000, taxRate: 10, amount: 220000, notes: null },
]);

// ============================================================
// QT-2026-0019: 京都料亭まつおか → 厨房改装
// ============================================================
const qtItems19: QuotationItem[] = withCostDefaults([
  { id: '301', sortOrder: 1, productId: null, productCode: null, productName: '冷蔵庫 縦型4ドア', quantity: 1, unit: '台', unitPrice: 1465000, taxRate: 10, amount: 1465000, notes: '寸法: W1,490×D800×H1,950' },
  { id: '302', sortOrder: 2, productId: null, productCode: null, productName: 'コールドテーブル（センターフリー） H850仕様', quantity: 1, unit: '台', unitPrice: 835000, taxRate: 10, amount: 835000, notes: '寸法: W1,200×D600×H850' },
  { id: '303', sortOrder: 3, productId: null, productCode: null, productName: 'ガスコンロ 5口（都市ガス13A）', quantity: 1, unit: '台', unitPrice: 364000, taxRate: 10, amount: 364000, notes: '寸法: W1,200×D750×H850　BG付' },
  { id: '304', sortOrder: 4, productId: null, productCode: null, productName: '台 BG付', quantity: 2, unit: '台', unitPrice: 57500, taxRate: 10, amount: 115000, notes: '寸法: W900×D600×H850' },
  { id: '305', sortOrder: 5, productId: null, productCode: null, productName: '水切付二槽シンク BG付', quantity: 1, unit: '台', unitPrice: 138800, taxRate: 10, amount: 138800, notes: '寸法: W1,500×D600×H850' },
  { id: '306', sortOrder: 6, productId: null, productCode: null, productName: '冷蔵ショーケース', quantity: 1, unit: '台', unitPrice: 433000, taxRate: 10, amount: 433000, notes: '寸法: W900×D600×H800' },
  { id: '307', sortOrder: 7, productId: null, productCode: null, productName: '酒燗器', quantity: 1, unit: '台', unitPrice: 140000, taxRate: 10, amount: 140000, notes: '寸法: W200×D390×H388' },
  { id: '308', sortOrder: 8, productId: null, productCode: null, productName: '給湯ポット（5ℓ）', quantity: 1, unit: '台', unitPrice: 29000, taxRate: 10, amount: 29000, notes: '寸法: W234×D302×H387' },
  { id: '309', sortOrder: 9, productId: null, productCode: null, productName: 'タオルウォーマー', quantity: 1, unit: '台', unitPrice: 50000, taxRate: 10, amount: 50000, notes: '寸法: W350×D275×H290' },
  { id: '310', sortOrder: 10, productId: null, productCode: null, productName: '台下戸棚 下部片面戸棚', quantity: 2, unit: '台', unitPrice: 137000, taxRate: 10, amount: 274000, notes: '寸法: W1,500×D600×H850' },
  { id: '311', sortOrder: 11, productId: null, productCode: null, productName: 'シンク付台', quantity: 1, unit: '台', unitPrice: 125200, taxRate: 10, amount: 125200, notes: '寸法: W1,320×D600×H850' },
  // 工事費
  { id: '312', sortOrder: 12, productId: null, productCode: null, productName: '機器運搬及び現場搬入費', quantity: 1, unit: '式', unitPrice: 250000, taxRate: 10, amount: 250000, notes: null },
  { id: '313', sortOrder: 13, productId: null, productCode: null, productName: '現場据付費及び取付費', quantity: 1, unit: '式', unitPrice: 380000, taxRate: 10, amount: 380000, notes: null },
  { id: '314', sortOrder: 14, productId: null, productCode: null, productName: '試運転調整及び諸経費', quantity: 1, unit: '式', unitPrice: 120000, taxRate: 10, amount: 120000, notes: null },
]);

// ============================================================
// QT-2026-0018: 南海ケータリング → 調理室ガス機器更新
// ============================================================
const qtItems18: QuotationItem[] = withCostDefaults([
  { id: '401', sortOrder: 1, productId: null, productCode: null, productName: 'ガステーブル BG付 H850仕様', quantity: 1, unit: '台', unitPrice: 364000, taxRate: 10, amount: 364000, notes: '寸法: W1,200×D750×H850' },
  { id: '402', sortOrder: 2, productId: null, productCode: null, productName: 'ガスローレンジ', quantity: 1, unit: '台', unitPrice: 203000, taxRate: 10, amount: 203000, notes: '寸法: W600×D750×H450' },
  { id: '403', sortOrder: 3, productId: null, productCode: null, productName: 'フライヤー（都市ガス13A）', quantity: 1, unit: '台', unitPrice: 295000, taxRate: 10, amount: 295000, notes: '寸法: W350×D600×H850　油量13L' },
  { id: '404', sortOrder: 4, productId: null, productCode: null, productName: 'コールドテーブル H850仕様', quantity: 1, unit: '台', unitPrice: 88600, taxRate: 10, amount: 88600, notes: '寸法: W1,200×D600×H850' },
  { id: '405', sortOrder: 5, productId: null, productCode: null, productName: '一槽シンク BG付', quantity: 1, unit: '台', unitPrice: 75000, taxRate: 10, amount: 75000, notes: '寸法: W600×D600×H850' },
  { id: '406', sortOrder: 6, productId: null, productCode: null, productName: '台 BG付', quantity: 2, unit: '台', unitPrice: 57500, taxRate: 10, amount: 115000, notes: '寸法: W900×D600×H850' },
  { id: '407', sortOrder: 7, productId: null, productCode: null, productName: '機器運搬及び現場搬入費', quantity: 1, unit: '式', unitPrice: 120000, taxRate: 10, amount: 120000, notes: null },
  { id: '408', sortOrder: 8, productId: null, productCode: null, productName: '現場据付費及び取付費', quantity: 1, unit: '式', unitPrice: 180000, taxRate: 10, amount: 180000, notes: null },
  { id: '409', sortOrder: 9, productId: null, productCode: null, productName: '試運転調整及び諸経費', quantity: 1, unit: '式', unitPrice: 80000, taxRate: 10, amount: 80000, notes: null },
]);

// ============================================================
// QT-2026-0017: なにわ食品 → 食品加工室 冷蔵・冷凍設備
// ============================================================
const qtItems17: QuotationItem[] = withCostDefaults([
  { id: '501', sortOrder: 1, productId: null, productCode: null, productName: '冷蔵庫 縦型6ドア', quantity: 1, unit: '台', unitPrice: 1680000, taxRate: 10, amount: 1680000, notes: '寸法: W1,790×D800×H1,950' },
  { id: '502', sortOrder: 2, productId: null, productCode: null, productName: '冷凍庫 縦型4ドア', quantity: 1, unit: '台', unitPrice: 1480000, taxRate: 10, amount: 1480000, notes: '寸法: W1,490×D800×H1,950' },
  { id: '503', sortOrder: 3, productId: null, productCode: null, productName: '製氷機 日産95kg', quantity: 2, unit: '台', unitPrice: 880000, taxRate: 10, amount: 1760000, notes: '寸法: W700×D525×H1,200' },
  { id: '504', sortOrder: 4, productId: null, productCode: null, productName: '機器運搬及び現場搬入費', quantity: 1, unit: '式', unitPrice: 250000, taxRate: 10, amount: 250000, notes: null },
  { id: '505', sortOrder: 5, productId: null, productCode: null, productName: '現場据付費及び取付費', quantity: 1, unit: '式', unitPrice: 350000, taxRate: 10, amount: 350000, notes: null },
  { id: '506', sortOrder: 6, productId: null, productCode: null, productName: '既存機器撤去処分費', quantity: 1, unit: '式', unitPrice: 280000, taxRate: 10, amount: 280000, notes: null },
]);

// ============================================================
// QT-2026-0016: 神戸ベイシェフ → ドリンクバー設備新設
// ============================================================
const qtItems16: QuotationItem[] = withCostDefaults([
  { id: '601', sortOrder: 1, productId: null, productCode: null, productName: 'コールドテーブル（センターフリー） H850仕様', quantity: 1, unit: '台', unitPrice: 835000, taxRate: 10, amount: 835000, notes: '寸法: W1,200×D600×H850' },
  { id: '602', sortOrder: 2, productId: null, productCode: null, productName: '一槽シンク BG付', quantity: 1, unit: '台', unitPrice: 75000, taxRate: 10, amount: 75000, notes: '寸法: W600×D600×H850' },
  { id: '603', sortOrder: 3, productId: null, productCode: null, productName: '台下戸棚 下部片面戸棚', quantity: 1, unit: '台', unitPrice: 137000, taxRate: 10, amount: 137000, notes: '寸法: W1,500×D600×H850' },
  { id: '604', sortOrder: 4, productId: null, productCode: null, productName: '冷蔵ショーケース', quantity: 1, unit: '台', unitPrice: 433000, taxRate: 10, amount: 433000, notes: '寸法: W900×D600×H800' },
  { id: '605', sortOrder: 5, productId: null, productCode: null, productName: '製氷機 日産25kg', quantity: 1, unit: '台', unitPrice: 500000, taxRate: 10, amount: 500000, notes: '寸法: W398×D450×H800' },
  { id: '606', sortOrder: 6, productId: null, productCode: null, productName: 'コーヒーメーカー', quantity: 1, unit: '台', unitPrice: 109560, taxRate: 10, amount: 109560, notes: '寸法: W210×D385×H455' },
  { id: '607', sortOrder: 7, productId: null, productCode: null, productName: 'ワインセラー 38本収納', quantity: 1, unit: '台', unitPrice: 150000, taxRate: 10, amount: 150000, notes: '寸法: W380×D527×H1,160' },
  { id: '608', sortOrder: 8, productId: null, productCode: null, productName: '機器運搬及び現場搬入費', quantity: 1, unit: '式', unitPrice: 80000, taxRate: 10, amount: 80000, notes: null },
  { id: '609', sortOrder: 9, productId: null, productCode: null, productName: '現場据付費及び取付費', quantity: 1, unit: '式', unitPrice: 120000, taxRate: 10, amount: 120000, notes: null },
  { id: '610', sortOrder: 10, productId: null, productCode: null, productName: '試運転調整及び諸経費', quantity: 1, unit: '式', unitPrice: 50000, taxRate: 10, amount: 50000, notes: null },
]);

// ============================================================
// QT-2026-0015: 新世界フーズ → ガス機器点検・部品交換
// ============================================================
const qtItems15: QuotationItem[] = withCostDefaults([
  { id: '701', sortOrder: 1, productId: null, productCode: null, productName: 'ガスコンロ バーナー交換（5口分）', quantity: 1, unit: '式', unitPrice: 125000, taxRate: 10, amount: 125000, notes: null },
  { id: '702', sortOrder: 2, productId: null, productCode: null, productName: 'フライヤー サーモスタット交換', quantity: 1, unit: '式', unitPrice: 45000, taxRate: 10, amount: 45000, notes: null },
  { id: '703', sortOrder: 3, productId: null, productCode: null, productName: 'ガス配管点検・調整', quantity: 1, unit: '式', unitPrice: 35000, taxRate: 10, amount: 35000, notes: null },
  { id: '704', sortOrder: 4, productId: null, productCode: null, productName: '出張費', quantity: 1, unit: '式', unitPrice: 15000, taxRate: 10, amount: 15000, notes: null },
]);

// ============================================================
// QT-2026-0014: 大阪グランドホテル → 宴会場カウンター設備追加
// ============================================================
const qtItems14: QuotationItem[] = withCostDefaults([
  { id: '801', sortOrder: 1, productId: null, productCode: null, productName: 'コールドテーブル H850仕様', quantity: 1, unit: '台', unitPrice: 835000, taxRate: 10, amount: 835000, notes: '寸法: W1,200×D600×H850' },
  { id: '802', sortOrder: 2, productId: null, productCode: null, productName: '一槽シンク BG付', quantity: 1, unit: '台', unitPrice: 75000, taxRate: 10, amount: 75000, notes: '寸法: W600×D600×H850' },
  { id: '803', sortOrder: 3, productId: null, productCode: null, productName: 'シンク付台', quantity: 1, unit: '台', unitPrice: 126000, taxRate: 10, amount: 126000, notes: '寸法: W1,350×D600×H850' },
  { id: '804', sortOrder: 4, productId: null, productCode: null, productName: '吊戸棚W/上棚', quantity: 1, unit: '台', unitPrice: 72900, taxRate: 10, amount: 72900, notes: '寸法: W900×D350×H736（1段）' },
  { id: '805', sortOrder: 5, productId: null, productCode: null, productName: '機器運搬及び現場搬入費', quantity: 1, unit: '式', unitPrice: 50000, taxRate: 10, amount: 50000, notes: null },
  { id: '806', sortOrder: 6, productId: null, productCode: null, productName: '現場据付費及び取付費', quantity: 1, unit: '式', unitPrice: 80000, taxRate: 10, amount: 80000, notes: null },
]);

// ============================================================
// QT-2026-0013: 泉州スナックフーズ → フライ後搬送ライン設備
// ============================================================
const qtItems13: QuotationItem[] = withCostDefaults([
  { id: '901', sortOrder: 1, productId: '90', productCode: 'CV01', productName: 'フライ後搬送コンベヤー', quantity: 1, unit: '台', unitPrice: 3927000, taxRate: 10, amount: 3927000, notes: 'ベルト巾600W×長さ5130L×搬送面高さ 入口H1000→出口H1200（傾斜2°）\nSUS304 ベルト緩め機能・ガイドH100付き\nベルト品番：SL-F3202裏面Vガイド付き（センター1条）' },
  { id: '902', sortOrder: 2, productId: '91', productCode: 'CV02', productName: 'フライ後中継コンベヤー', quantity: 1, unit: '台', unitPrice: 2640000, taxRate: 10, amount: 2640000, notes: 'ベルト巾600W×長さ2250L×搬送面高さH1000\nSUS304 ベルト緩め機能・ガイドH100付き' },
  { id: '903', sortOrder: 3, productId: '92', productCode: 'CV03', productName: 'バケット前搬送コンベヤー', quantity: 1, unit: '台', unitPrice: 4664000, taxRate: 10, amount: 4664000, notes: 'ベルト巾600W×長さ7670L×搬送面高さH800\nSUS304 ベルト緩め機能・ガイドH100付き' },
  { id: '904', sortOrder: 4, productId: '93', productCode: 'CV04', productName: 'バケット後搬送コンベヤー', quantity: 3, unit: '台', unitPrice: 4740000, taxRate: 10, amount: 14220000, notes: 'ベルト巾600W×長さ6000L×搬送面高さ 入口H800→出口H1400（傾斜）\nSUS304 キャスター付き' },
  { id: '905', sortOrder: 5, productId: '94', productCode: 'CV05', productName: '味付け計量コンベヤー前搬送コンベヤー', quantity: 1, unit: '台', unitPrice: 2976000, taxRate: 10, amount: 2976000, notes: 'ベルト巾600W×長さ3530L×搬送面高さH900\nSUS304 キャスター付き' },
  { id: '906', sortOrder: 6, productId: '95', productCode: 'CV06', productName: '味付け後搬送コンベヤー', quantity: 1, unit: '台', unitPrice: 3840000, taxRate: 10, amount: 3840000, notes: 'ベルト巾600W×長さ6130L×搬送面高さ 入口H900→出口H300（傾斜3〜5°）' },
]);

// ============================================================
// 見積一覧
// ============================================================

const sum = (items: QuotationItem[]) => items.reduce((s, i) => s + i.amount, 0);

export const mockQuotations: Quotation[] = [
  {
    id: '21',
    quotationNumber: 'QT-2026-0021',
    customerId: '1',
    customer: { id: '1', name: '株式会社大阪グランドホテル', code: 'C001' },
    subject: '宴会場厨房機器一式',
    quotationDate: '2026-03-08',
    validUntil: '2026-04-08',
    subtotal: sum(qtItems21),
    taxAmount: Math.floor(sum(qtItems21) * 0.1),
    totalAmount: sum(qtItems21) + Math.floor(sum(qtItems21) * 0.1),
    notes: '納品場所: 本館3F宴会場厨房\n納品期日: 御打ち合わせの上\n※給排水、電気、ガス各接続工事は別途。\n※概算見積もりとなります。',
    internalMemo: null,
    status: 'draft',
    items: qtItems21,
    createdByName: '岩田 隆宏',
    createdAt: '2026-03-08T09:00:00.000Z',
    updatedAt: '2026-03-08T09:00:00.000Z',
  },
  {
    id: '20',
    quotationNumber: 'QT-2026-0020',
    customerId: '2',
    customer: { id: '2', name: '天満屋フードサービス株式会社', code: 'C002' },
    subject: 'セントラルキッチン改修工事',
    quotationDate: '2026-03-03',
    validUntil: '2026-04-03',
    subtotal: sum(qtItems20),
    taxAmount: Math.floor(sum(qtItems20) * 0.1),
    totalAmount: sum(qtItems20) + Math.floor(sum(qtItems20) * 0.1),
    notes: '納品場所: 天神橋工場2F\n※既存機器の撤去処分費を含みます。\n※深夜作業の場合、別途割増料金が発生します。',
    internalMemo: '大型案件。フライトタイプ洗浄機は納期6〜8週間。搬入経路の事前確認要。',
    status: 'sent',
    items: qtItems20,
    createdByName: '岩田 隆宏',
    createdAt: '2026-03-03T10:00:00.000Z',
    updatedAt: '2026-03-04T14:00:00.000Z',
  },
  {
    id: '19',
    quotationNumber: 'QT-2026-0019',
    customerId: '5',
    customer: { id: '5', name: '株式会社京都料亭まつおか', code: 'C005' },
    subject: '厨房改装工事（調理場・配膳室）',
    quotationDate: '2026-02-25',
    validUntil: '2026-03-25',
    subtotal: sum(qtItems19),
    taxAmount: Math.floor(sum(qtItems19) * 0.1),
    totalAmount: sum(qtItems19) + Math.floor(sum(qtItems19) * 0.1),
    notes: '納品場所: 本店地下1F厨房\n納品期日: 3月下旬予定\n※平日日中作業を条件とします。',
    internalMemo: 'VIP顧客。前回QT-0012で冷蔵庫納品済み。今回は追加改装分。',
    status: 'approved',
    items: qtItems19,
    createdByName: '岩田 隆宏',
    createdAt: '2026-02-25T09:00:00.000Z',
    updatedAt: '2026-03-05T11:00:00.000Z',
  },
  {
    id: '18',
    quotationNumber: 'QT-2026-0018',
    customerId: '4',
    customer: { id: '4', name: '南海ケータリング株式会社', code: 'C004' },
    subject: '調理室ガス機器更新',
    quotationDate: '2026-02-18',
    validUntil: '2026-03-18',
    subtotal: sum(qtItems18),
    taxAmount: Math.floor(sum(qtItems18) * 0.1),
    totalAmount: sum(qtItems18) + Math.floor(sum(qtItems18) * 0.1),
    notes: '納品期日: 3月中旬予定\n※平日日中作業を条件とします。',
    internalMemo: null,
    status: 'approved',
    items: qtItems18,
    createdByName: '八木厨房 管理者',
    createdAt: '2026-02-18T14:00:00.000Z',
    updatedAt: '2026-02-28T10:00:00.000Z',
  },
  {
    id: '17',
    quotationNumber: 'QT-2026-0017',
    customerId: '3',
    customer: { id: '3', name: '株式会社なにわ食品', code: 'C003' },
    subject: '食品加工室 冷蔵・冷凍設備入替',
    quotationDate: '2026-02-10',
    validUntil: '2026-03-10',
    subtotal: sum(qtItems17),
    taxAmount: Math.floor(sum(qtItems17) * 0.1),
    totalAmount: sum(qtItems17) + Math.floor(sum(qtItems17) * 0.1),
    notes: '既存製氷機2台の入替、冷蔵庫・冷凍庫各1台増設。\n※撤去処分費含む。',
    internalMemo: '搬入経路が狭いため要事前確認。',
    status: 'sent',
    items: qtItems17,
    createdByName: '八木厨房 管理者',
    createdAt: '2026-02-10T11:00:00.000Z',
    updatedAt: '2026-02-12T09:00:00.000Z',
  },
  {
    id: '16',
    quotationNumber: 'QT-2026-0016',
    customerId: '8',
    customer: { id: '8', name: '株式会社神戸ベイシェフ', code: 'C008' },
    subject: 'ドリンクバー設備新設',
    quotationDate: '2026-02-05',
    validUntil: '2026-03-05',
    subtotal: sum(qtItems16),
    taxAmount: Math.floor(sum(qtItems16) * 0.1),
    totalAmount: sum(qtItems16) + Math.floor(sum(qtItems16) * 0.1),
    notes: '納品場所: 1Fカフェエリア\n※ワインセラーは受注後2週間。',
    internalMemo: null,
    status: 'sent',
    items: qtItems16,
    createdByName: '岩田 隆宏',
    createdAt: '2026-02-05T10:00:00.000Z',
    updatedAt: '2026-02-06T09:00:00.000Z',
  },
  {
    id: '15',
    quotationNumber: 'QT-2026-0015',
    customerId: '6',
    customer: { id: '6', name: '新世界フーズ株式会社', code: 'C006' },
    subject: 'ガス機器点検・部品交換',
    quotationDate: '2026-01-28',
    validUntil: '2026-02-28',
    subtotal: sum(qtItems15),
    taxAmount: Math.floor(sum(qtItems15) * 0.1),
    totalAmount: sum(qtItems15) + Math.floor(sum(qtItems15) * 0.1),
    notes: null,
    internalMemo: '修理見積。小規模案件。',
    status: 'rejected',
    items: qtItems15,
    createdByName: '八木厨房 管理者',
    createdAt: '2026-01-28T10:00:00.000Z',
    updatedAt: '2026-02-05T16:00:00.000Z',
  },
  {
    id: '14',
    quotationNumber: 'QT-2026-0014',
    customerId: '1',
    customer: { id: '1', name: '株式会社大阪グランドホテル', code: 'C001' },
    subject: '宴会場カウンター設備追加',
    quotationDate: '2026-01-15',
    validUntil: '2026-02-15',
    subtotal: sum(qtItems14),
    taxAmount: Math.floor(sum(qtItems14) * 0.1),
    totalAmount: sum(qtItems14) + Math.floor(sum(qtItems14) * 0.1),
    notes: '納品場所: 本館3F宴会場カウンター裏\n※QT-0021の関連案件',
    internalMemo: null,
    status: 'approved',
    items: qtItems14,
    createdByName: '岩田 隆宏',
    createdAt: '2026-01-15T11:00:00.000Z',
    updatedAt: '2026-01-25T09:00:00.000Z',
  },
  {
    id: '13',
    quotationNumber: 'QT-2026-0013',
    customerId: '13',
    customer: { id: '13', name: '株式会社泉州スナックフーズ', code: 'C013' },
    subject: 'フライ後搬送ライン設備一式',
    quotationDate: '2026-01-10',
    validUntil: '2026-02-10',
    subtotal: sum(qtItems13),
    taxAmount: Math.floor(sum(qtItems13) * 0.1),
    totalAmount: sum(qtItems13) + Math.floor(sum(qtItems13) * 0.1),
    notes: '納品期日: 受注決定後約5ヶ月\n納品場所: 御社工場\n※運送費、搬入、組立費等は含まれておりません。\n※運転操作盤への電気接続工事は別途。\n※搬送物：フライ後生地（最高120℃）搬送量：最大440kg/h ベルト速度：3m/min',
    internalMemo: '大型案件。コンベヤー本体は関西金網、電装は松本電機に発注。納期5ヶ月。',
    status: 'sent',
    items: qtItems13,
    createdByName: '岩田 隆宏',
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-01-12T14:00:00.000Z',
  },
];

export const mockQuotationsResponse: QuotationsResponse = {
  quotations: mockQuotations.map(({ items: _items, ...rest }) => rest),
  total: mockQuotations.length,
};
