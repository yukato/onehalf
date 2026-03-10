import type { Customer, Product, ProductCategory, CustomersResponse, ProductsResponse, ProductCategoriesResponse } from '@/types';

// ---------- 商品カテゴリ ----------

export const mockProductCategories: ProductCategory[] = [
  { id: '1', name: '作業台・シンク', slug: 'worktables', sortOrder: 1 },
  { id: '2', name: '冷蔵・冷凍機器', slug: 'refrigeration', sortOrder: 2 },
  { id: '3', name: '加熱機器', slug: 'heating', sortOrder: 3 },
  { id: '4', name: '洗浄機器', slug: 'washing', sortOrder: 4 },
  { id: '5', name: '調理機器', slug: 'cooking', sortOrder: 5 },
  { id: '6', name: '収納・棚', slug: 'storage', sortOrder: 6 },
  { id: '7', name: '製氷機', slug: 'ice-maker', sortOrder: 7 },
  { id: '8', name: 'ドリンク・サービス機器', slug: 'beverage', sortOrder: 8 },
  { id: '9', name: '工事・サービス', slug: 'service', sortOrder: 9 },
  { id: '10', name: 'コンベヤー・搬送機器', slug: 'conveyor', sortOrder: 10 },
];

// ---------- 取引先 ----------

export const mockCustomers: Customer[] = [
  {
    id: '1', code: 'C001', name: '株式会社大阪グランドホテル', nameKana: 'オオサカグランドホテル',
    customerType: 'customer', postalCode: '541-0041', address: '大阪市中央区北浜2-1-1',
    phone: '06-1234-5678', fax: '06-1234-5679', email: 'info@osaka-grand.co.jp',
    contactPerson: '山本 一郎', paymentTerms: '月末締め翌月末払い', notes: null,
    isActive: true, createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: '2', code: 'C002', name: '天満屋フードサービス株式会社', nameKana: 'テンマヤフードサービス',
    customerType: 'customer', postalCode: '530-0041', address: '大阪市北区天神橋3-5-10',
    phone: '06-2345-6789', fax: '06-2345-6780', email: 'order@tenmaya-food.co.jp',
    contactPerson: '高橋 次郎', paymentTerms: '月末締め翌月末払い', notes: null,
    isActive: true, createdAt: '2025-05-01T00:00:00.000Z', updatedAt: '2026-01-20T00:00:00.000Z',
  },
  {
    id: '3', code: 'C003', name: '株式会社なにわ食品', nameKana: 'ナニワショクヒン',
    customerType: 'customer', postalCode: '556-0016', address: '大阪市浪速区元町1-8-3',
    phone: '06-3456-7890', fax: null, email: 'naniwa@naniwa-foods.co.jp',
    contactPerson: '中村 三郎', paymentTerms: '20日締め翌月10日払い', notes: null,
    isActive: true, createdAt: '2025-06-01T00:00:00.000Z', updatedAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: '4', code: 'C004', name: '南海ケータリング株式会社', nameKana: 'ナンカイケータリング',
    customerType: 'customer', postalCode: '590-0075', address: '堺市堺区南花田口町2-3-1',
    phone: '072-123-4567', fax: null, email: null,
    contactPerson: '伊藤 四郎', paymentTerms: '月末締め翌月末払い', notes: null,
    isActive: true, createdAt: '2025-07-01T00:00:00.000Z', updatedAt: '2026-02-15T00:00:00.000Z',
  },
  {
    id: '5', code: 'C005', name: '株式会社京都料亭まつおか', nameKana: 'キョウトリョウテイマツオカ',
    customerType: 'customer', postalCode: '604-8001', address: '京都市中京区烏丸通御池上ル',
    phone: '075-234-5678', fax: '075-234-5679', email: 'matsuoka@kyoto-ryotei.co.jp',
    contactPerson: '松岡 五郎', paymentTerms: '月末締め翌月末払い', notes: 'VIP顧客',
    isActive: true, createdAt: '2025-08-01T00:00:00.000Z', updatedAt: '2026-02-20T00:00:00.000Z',
  },
  {
    id: '6', code: 'C006', name: '新世界フーズ株式会社', nameKana: 'シンセカイフーズ',
    customerType: 'both', postalCode: '556-0002', address: '大阪市浪速区恵美須東1-18-6',
    phone: '06-4567-8901', fax: null, email: 'info@shinsekai-foods.co.jp',
    contactPerson: '鈴木 六郎', paymentTerms: '月末締め翌月末払い', notes: null,
    isActive: true, createdAt: '2025-09-01T00:00:00.000Z', updatedAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: '7', code: 'S001', name: '有限会社堺水産市場', nameKana: 'サカイスイサンイチバ',
    customerType: 'supplier', postalCode: '590-0984', address: '堺市堺区戎島町5-1',
    phone: '072-234-5678', fax: null, email: null,
    contactPerson: '加藤 七郎', paymentTerms: '月末締め翌月末払い', notes: null,
    isActive: true, createdAt: '2025-10-01T00:00:00.000Z', updatedAt: '2026-02-05T00:00:00.000Z',
  },
  {
    id: '8', code: 'C008', name: '株式会社神戸ベイシェフ', nameKana: 'コウベベイシェフ',
    customerType: 'customer', postalCode: '650-0044', address: '神戸市中央区東川崎町1-3-3',
    phone: '078-345-6789', fax: '078-345-6780', email: 'chef@kobe-bay.co.jp',
    contactPerson: '渡辺 八郎', paymentTerms: '月末締め翌月末払い', notes: null,
    isActive: true, createdAt: '2025-11-01T00:00:00.000Z', updatedAt: '2026-02-25T00:00:00.000Z',
  },
  {
    id: '9', code: 'C009', name: '株式会社奈良ホテルダイニング', nameKana: 'ナラホテルダイニング',
    customerType: 'customer', postalCode: '630-8301', address: '奈良市高畑町1096',
    phone: '0742-26-1234', fax: '0742-26-1235', email: 'dining@nara-hotel.co.jp',
    contactPerson: '佐藤 健一', paymentTerms: '月末締め翌月末払い', notes: null,
    isActive: true, createdAt: '2025-12-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: '10', code: 'C010', name: '和歌山マリーナシティリゾート', nameKana: 'ワカヤママリーナシティリゾート',
    customerType: 'customer', postalCode: '641-0014', address: '和歌山市毛見1527',
    phone: '073-448-1234', fax: null, email: 'resort@wakayama-marina.co.jp',
    contactPerson: '田辺 洋子', paymentTerms: '月末締め翌月末払い', notes: null,
    isActive: true, createdAt: '2026-01-10T00:00:00.000Z', updatedAt: '2026-03-05T00:00:00.000Z',
  },
  {
    id: '11', code: 'C011', name: '株式会社北浜ダイニングラボ', nameKana: 'キタハマダイニングラボ',
    customerType: 'customer', postalCode: '541-0042', address: '大阪市中央区今橋1-7-3',
    phone: '06-5678-9012', fax: null, email: 'info@kitahama-dining.co.jp',
    contactPerson: '西田 達也', paymentTerms: '20日締め翌月末払い', notes: '新規取引先（2026年〜）',
    isActive: true, createdAt: '2026-01-20T00:00:00.000Z', updatedAt: '2026-02-28T00:00:00.000Z',
  },
  {
    id: '13', code: 'C013', name: '株式会社泉州スナックフーズ', nameKana: 'センシュウスナックフーズ',
    customerType: 'customer', postalCode: '598-0048', address: '泉佐野市りんくう往来北1-8',
    phone: '072-458-1234', fax: '072-458-1235', email: 'tech@senshu-snack.co.jp',
    contactPerson: '高橋 雅人', paymentTerms: '20日締め翌月末払い', notes: '食品製造ライン設備',
    isActive: true, createdAt: '2025-06-15T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: '14', code: 'C014', name: '近畿フーズプロセッシング株式会社', nameKana: 'キンキフーズプロセッシング',
    customerType: 'customer', postalCode: '571-0048', address: '門真市新橋町3-1-15',
    phone: '06-6900-1234', fax: '06-6900-1235', email: 'factory@kinki-fp.co.jp',
    contactPerson: '森田 和彦', paymentTerms: '月末締め翌月末払い', notes: null,
    isActive: true, createdAt: '2025-09-01T00:00:00.000Z', updatedAt: '2026-02-15T00:00:00.000Z',
  },
  {
    id: '12', code: 'S002', name: '関西厨房機器卸センター', nameKana: 'カンサイチュウボウキキオロシセンター',
    customerType: 'supplier', postalCode: '577-0011', address: '東大阪市荒本北1-4-17',
    phone: '06-6789-0123', fax: '06-6789-0124', email: 'sales@kansai-chubo.co.jp',
    contactPerson: '岡田 誠', paymentTerms: '月末締め翌月末払い', notes: '主要仕入先',
    isActive: true, createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-20T00:00:00.000Z',
  },
];

// ---------- 商品 ----------

export const mockProducts: Product[] = [
  // --- 作業台・シンク (categoryId: 1) ---
  {
    id: '1', code: 'P001', name: 'ステンレス作業台 BG付 900mm', nameKana: 'ステンレスサギョウダイ',
    category: mockProductCategories[0], categoryId: '1', unit: '台',
    unitPrice: 57500, costPrice: 34000, taxRate: 10,
    description: 'SUS304 バックガード付き W900×D600×H850', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: '2', code: 'P002', name: 'ステンレス作業台 BG付 1200mm', nameKana: 'ステンレスサギョウダイ',
    category: mockProductCategories[0], categoryId: '1', unit: '台',
    unitPrice: 65000, costPrice: 38000, taxRate: 10,
    description: 'SUS304 バックガード付き W1,200×D600×H850', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: '3', code: 'P003', name: '二槽シンク BG付 1500mm', nameKana: 'ニソウシンク',
    category: mockProductCategories[0], categoryId: '1', unit: '台',
    unitPrice: 130800, costPrice: 78000, taxRate: 10,
    description: 'SUS430 W1,500×D600×H850', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-05T00:00:00.000Z',
  },
  {
    id: '4', code: 'P004', name: '一槽シンク BG付 600mm', nameKana: 'イチソウシンク',
    category: mockProductCategories[0], categoryId: '1', unit: '台',
    unitPrice: 75000, costPrice: 44000, taxRate: 10,
    description: 'SUS430 W600×D600×H850', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-05T00:00:00.000Z',
  },
  {
    id: '5', code: 'P005', name: '一槽シンク BG付 750mm', nameKana: 'イチソウシンク',
    category: mockProductCategories[0], categoryId: '1', unit: '台',
    unitPrice: 78000, costPrice: 46000, taxRate: 10,
    description: 'SUS430 W750×D600×H850', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-05T00:00:00.000Z',
  },
  {
    id: '6', code: 'P006', name: '水切付二槽シンク BG付 1500mm', nameKana: 'ミズキリツキニソウシンク',
    category: mockProductCategories[0], categoryId: '1', unit: '台',
    unitPrice: 138800, costPrice: 82000, taxRate: 10,
    description: 'SUS430 W1,500×D600×H850', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-05T00:00:00.000Z',
  },
  {
    id: '7', code: 'P007', name: 'シンク付台 1320mm', nameKana: 'シンクツキダイ',
    category: mockProductCategories[0], categoryId: '1', unit: '台',
    unitPrice: 125200, costPrice: 74000, taxRate: 10,
    description: 'SUS304 W1,320×D600×H850', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: '8', code: 'P008', name: '移動台 キャスター径125mm', nameKana: 'イドウダイ',
    category: mockProductCategories[0], categoryId: '1', unit: '台',
    unitPrice: 82800, costPrice: 49000, taxRate: 10,
    description: 'SUS304 W750×D600×H850 キャスター付', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-10T00:00:00.000Z',
  },

  // --- 冷蔵・冷凍機器 (categoryId: 2) ---
  {
    id: '10', code: 'P010', name: '冷蔵庫 縦型4ドア', nameKana: 'レイゾウコタテガタ4ドア',
    category: mockProductCategories[1], categoryId: '2', unit: '台',
    unitPrice: 1465000, costPrice: 920000, taxRate: 10,
    description: 'W1,490×D800×H1,950 容量1200L', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-20T00:00:00.000Z',
  },
  {
    id: '11', code: 'P011', name: '冷蔵庫 縦型6ドア', nameKana: 'レイゾウコタテガタ6ドア',
    category: mockProductCategories[1], categoryId: '2', unit: '台',
    unitPrice: 1680000, costPrice: 1050000, taxRate: 10,
    description: 'W1,790×D800×H1,950 容量1600L', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-20T00:00:00.000Z',
  },
  {
    id: '12', code: 'P012', name: '冷凍庫 縦型2ドア（左開仕様）', nameKana: 'レイトウコタテガタ2ドア',
    category: mockProductCategories[1], categoryId: '2', unit: '台',
    unitPrice: 1137000, costPrice: 710000, taxRate: 10,
    description: 'W610×D800×H1,950', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: '13', code: 'P013', name: '冷凍庫 縦型4ドア', nameKana: 'レイトウコタテガタ4ドア',
    category: mockProductCategories[1], categoryId: '2', unit: '台',
    unitPrice: 1480000, costPrice: 920000, taxRate: 10,
    description: 'W1,490×D800×H1,950', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: '14', code: 'P014', name: 'コールドテーブル H850仕様 1200mm', nameKana: 'コールドテーブル',
    category: mockProductCategories[1], categoryId: '2', unit: '台',
    unitPrice: 88600, costPrice: 53000, taxRate: 10,
    description: 'W1,200×D600×H850 センターフリー', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: '15', code: 'P015', name: 'コールドテーブル H850仕様 1500mm', nameKana: 'コールドテーブル',
    category: mockProductCategories[1], categoryId: '2', unit: '台',
    unitPrice: 125000, costPrice: 75000, taxRate: 10,
    description: 'W1,500×D600×H850', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: '16', code: 'P016', name: '冷蔵ショーケース 900mm', nameKana: 'レイゾウショーケース',
    category: mockProductCategories[1], categoryId: '2', unit: '台',
    unitPrice: 433000, costPrice: 270000, taxRate: 10,
    description: 'W900×D600×H800', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-25T00:00:00.000Z',
  },
  {
    id: '17', code: 'P017', name: '冷蔵ショーケース 460mm', nameKana: 'レイゾウショーケース',
    category: mockProductCategories[1], categoryId: '2', unit: '台',
    unitPrice: 309000, costPrice: 193000, taxRate: 10,
    description: 'W460×D492×H1,522', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-25T00:00:00.000Z',
  },

  // --- 加熱機器 (categoryId: 3) ---
  {
    id: '20', code: 'P020', name: 'ガステーブル BG付 H850仕様 1200mm', nameKana: 'ガステーブル',
    category: mockProductCategories[2], categoryId: '3', unit: '台',
    unitPrice: 364000, costPrice: 228000, taxRate: 10,
    description: 'W1,200×D750×H850 都市ガス13A', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: '21', code: 'P021', name: 'ガステーブル BG付 H850仕様 1800mm', nameKana: 'ガステーブル',
    category: mockProductCategories[2], categoryId: '3', unit: '台',
    unitPrice: 485000, costPrice: 304000, taxRate: 10,
    description: 'W1,800×D750×H850 都市ガス13A', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: '22', code: 'P022', name: 'ガスローレンジ 600mm', nameKana: 'ガスローレンジ',
    category: mockProductCategories[2], categoryId: '3', unit: '台',
    unitPrice: 203000, costPrice: 127000, taxRate: 10,
    description: 'W600×D750×H450 都市ガス13A', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: '23', code: 'P023', name: 'ガスコンロ 5口（都市ガス13A）', nameKana: 'ガスコンロ',
    category: mockProductCategories[2], categoryId: '3', unit: '台',
    unitPrice: 364000, costPrice: 228000, taxRate: 10,
    description: 'W1,200×D750×H850 BG付', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: '24', code: 'P024', name: 'フライヤー（都市ガス13A）18L', nameKana: 'フライヤー',
    category: mockProductCategories[2], categoryId: '3', unit: '台',
    unitPrice: 385000, costPrice: 241000, taxRate: 10,
    description: 'W450×D600×H850 油量18L', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: '25', code: 'P025', name: 'フライヤー（都市ガス13A）13L', nameKana: 'フライヤー',
    category: mockProductCategories[2], categoryId: '3', unit: '台',
    unitPrice: 295000, costPrice: 185000, taxRate: 10,
    description: 'W350×D600×H850 油量13L', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: '26', code: 'P026', name: 'ゆで麺機（都市ガス13A）', nameKana: 'ユデメンキ',
    category: mockProductCategories[2], categoryId: '3', unit: '台',
    unitPrice: 320000, costPrice: 200000, taxRate: 10,
    description: 'W450×D600×H850', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: '27', code: 'P027', name: '電気サラマンダー（3相-200V）', nameKana: 'デンキサラマンダー',
    category: mockProductCategories[2], categoryId: '3', unit: '台',
    unitPrice: 516000, costPrice: 323000, taxRate: 10,
    description: 'W600×D455×H530', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-10T00:00:00.000Z',
  },

  // --- 洗浄機器 (categoryId: 4) ---
  {
    id: '30', code: 'P030', name: 'ボックスタイプ洗浄機', nameKana: 'ボックスタイプセンジョウキ',
    category: mockProductCategories[3], categoryId: '4', unit: '台',
    unitPrice: 1326000, costPrice: 830000, taxRate: 10,
    description: 'W600×D600×H1,277', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-25T00:00:00.000Z',
  },
  {
    id: '31', code: 'P031', name: '食器洗浄機 アンダーカウンター', nameKana: 'ショッキセンジョウキ',
    category: mockProductCategories[3], categoryId: '4', unit: '台',
    unitPrice: 320000, costPrice: 200000, taxRate: 10,
    description: 'ブースター別売', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-25T00:00:00.000Z',
  },
  {
    id: '32', code: 'P032', name: 'フライトタイプ洗浄機 電気ブースター内蔵', nameKana: 'フライトタイプセンジョウキ',
    category: mockProductCategories[3], categoryId: '4', unit: '台',
    unitPrice: 4200000, costPrice: 2630000, taxRate: 10,
    description: 'W680×D2,680×H1,540', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-25T00:00:00.000Z',
  },
  {
    id: '33', code: 'P033', name: '1槽ソイルドテーブル（ダスト缶付）1500mm', nameKana: 'ソイルドテーブル',
    category: mockProductCategories[3], categoryId: '4', unit: '台',
    unitPrice: 264000, costPrice: 165000, taxRate: 10,
    description: 'W1,500×D650×H850', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-25T00:00:00.000Z',
  },
  {
    id: '34', code: 'P034', name: '1槽ソイルドテーブル（ダスト缶付）1800mm', nameKana: 'ソイルドテーブル',
    category: mockProductCategories[3], categoryId: '4', unit: '台',
    unitPrice: 295000, costPrice: 185000, taxRate: 10,
    description: 'W1,800×D750×H850', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-25T00:00:00.000Z',
  },
  {
    id: '35', code: 'P035', name: 'クリーンテーブル 1500mm', nameKana: 'クリーンテーブル',
    category: mockProductCategories[3], categoryId: '4', unit: '台',
    unitPrice: 210000, costPrice: 131000, taxRate: 10,
    description: 'W1,500×D750×H850', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-25T00:00:00.000Z',
  },

  // --- 調理機器 (categoryId: 5) ---
  {
    id: '40', code: 'P040', name: 'スチームコンベクションオーブン（2/3サイズ6枚収納）', nameKana: 'スチコン',
    category: mockProductCategories[4], categoryId: '5', unit: '台',
    unitPrice: 1946000, costPrice: 1218000, taxRate: 10,
    description: 'W655×D621×H595 電気式', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-15T00:00:00.000Z',
  },
  {
    id: '41', code: 'P041', name: 'スチームコンベクションオーブン（1/1サイズ10枚収納）', nameKana: 'スチコン',
    category: mockProductCategories[4], categoryId: '5', unit: '台',
    unitPrice: 2850000, costPrice: 1783000, taxRate: 10,
    description: 'W850×D775×H1,020 電気式 プログラム制御', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-15T00:00:00.000Z',
  },
  {
    id: '42', code: 'P042', name: 'スチコン専用架台 片側ホテルパン差し付', nameKana: 'スチコンカダイ',
    category: mockProductCategories[4], categoryId: '5', unit: '台',
    unitPrice: 226000, costPrice: 141000, taxRate: 10,
    description: 'W700×D530×H850', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-15T00:00:00.000Z',
  },
  {
    id: '43', code: 'P043', name: 'スチコン専用架台', nameKana: 'スチコンカダイ',
    category: mockProductCategories[4], categoryId: '5', unit: '台',
    unitPrice: 280000, costPrice: 175000, taxRate: 10,
    description: 'W850×D700×H850', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-15T00:00:00.000Z',
  },
  {
    id: '44', code: 'P044', name: 'フードカッター FC-200', nameKana: 'フードカッター',
    category: mockProductCategories[4], categoryId: '5', unit: '台',
    unitPrice: 68000, costPrice: 42000, taxRate: 10,
    description: '多機能野菜カッター', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: '45', code: 'P045', name: 'IHジャー炊飯器', nameKana: 'アイエイチジャースイハンキ',
    category: mockProductCategories[4], categoryId: '5', unit: '台',
    unitPrice: 200000, costPrice: 125000, taxRate: 10,
    description: 'W502×D429×H410', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: '46', code: 'P046', name: '炊飯カート', nameKana: 'スイハンカート',
    category: mockProductCategories[4], categoryId: '5', unit: '台',
    unitPrice: 32500, costPrice: 20000, taxRate: 10,
    description: 'W450×D450×H95', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-10T00:00:00.000Z',
  },

  // --- 収納・棚 (categoryId: 6) ---
  {
    id: '50', code: 'P050', name: '吊戸棚 ステンレス 1500mm', nameKana: 'ツリトダナ',
    category: mockProductCategories[5], categoryId: '6', unit: '台',
    unitPrice: 42000, costPrice: 25000, taxRate: 10,
    description: 'SUS304 ガラス引戸 W1,500×D300×1段', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: '51', code: 'P051', name: '吊戸棚W/上棚 1200mm', nameKana: 'ツリトダナウワダナ',
    category: mockProductCategories[5], categoryId: '6', unit: '台',
    unitPrice: 88600, costPrice: 53000, taxRate: 10,
    description: 'W1,200×D350×H736（1段）', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: '52', code: 'P052', name: '台下戸棚 下部両面戸棚 1580mm', nameKana: 'ダイシタトダナ',
    category: mockProductCategories[5], categoryId: '6', unit: '台',
    unitPrice: 252000, costPrice: 158000, taxRate: 10,
    description: 'W1,580×D750×H850', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: '53', code: 'P053', name: '台下戸棚 下部片面スイング扉 650mm', nameKana: 'ダイシタトダナ',
    category: mockProductCategories[5], categoryId: '6', unit: '台',
    unitPrice: 136000, costPrice: 85000, taxRate: 10,
    description: 'W650×D750×H850', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: '54', code: 'P054', name: '台下戸棚 下部片面戸棚 1500mm', nameKana: 'ダイシタトダナ',
    category: mockProductCategories[5], categoryId: '6', unit: '台',
    unitPrice: 137000, costPrice: 86000, taxRate: 10,
    description: 'W1,500×D600×H850', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: '55', code: 'P055', name: 'シェルフ（ベンチ4段）', nameKana: 'シェルフ',
    category: mockProductCategories[5], categoryId: '6', unit: '台',
    unitPrice: 166000, costPrice: 104000, taxRate: 10,
    description: 'W1,215×D620×H1,886', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: '56', code: 'P056', name: 'シェルフ（ベンチ5段）', nameKana: 'シェルフ',
    category: mockProductCategories[5], categoryId: '6', unit: '台',
    unitPrice: 185000, costPrice: 116000, taxRate: 10,
    description: 'W1,520×D620×H1,886', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: '57', code: 'P057', name: 'ラックシェルフ 1100mm', nameKana: 'ラックシェルフ',
    category: mockProductCategories[5], categoryId: '6', unit: '台',
    unitPrice: 42000, costPrice: 26000, taxRate: 10,
    description: 'W1,100×D400×1段', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: '58', code: 'P058', name: '上棚 1500mm', nameKana: 'ウワダナ',
    category: mockProductCategories[5], categoryId: '6', unit: '台',
    unitPrice: 30800, costPrice: 19000, taxRate: 10,
    description: 'W1,500×D300×1段', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-01-10T00:00:00.000Z',
  },

  // --- 製氷機 (categoryId: 7) ---
  {
    id: '60', code: 'P060', name: '製氷機 日産25kg', nameKana: 'セイヒョウキ',
    category: mockProductCategories[6], categoryId: '7', unit: '台',
    unitPrice: 500000, costPrice: 313000, taxRate: 10,
    description: 'W398×D450×H800', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-05T00:00:00.000Z',
  },
  {
    id: '61', code: 'P061', name: '製氷機 日産55kg', nameKana: 'セイヒョウキ',
    category: mockProductCategories[6], categoryId: '7', unit: '台',
    unitPrice: 680000, costPrice: 425000, taxRate: 10,
    description: 'W630×D500×H800', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-05T00:00:00.000Z',
  },
  {
    id: '62', code: 'P062', name: '製氷機 日産95kg', nameKana: 'セイヒョウキ',
    category: mockProductCategories[6], categoryId: '7', unit: '台',
    unitPrice: 880000, costPrice: 550000, taxRate: 10,
    description: 'W700×D525×H1,200', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-05T00:00:00.000Z',
  },

  // --- ドリンク・サービス機器 (categoryId: 8) ---
  {
    id: '70', code: 'P070', name: 'ワインセラー 38本収納', nameKana: 'ワインセラー',
    category: mockProductCategories[7], categoryId: '8', unit: '台',
    unitPrice: 150000, costPrice: 94000, taxRate: 10,
    description: 'W380×D527×H1,160', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: '71', code: 'P071', name: 'コーヒーメーカー', nameKana: 'コーヒーメーカー',
    category: mockProductCategories[7], categoryId: '8', unit: '台',
    unitPrice: 109560, costPrice: 68000, taxRate: 10,
    description: 'W210×D385×H455', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: '72', code: 'P072', name: '酒燗器', nameKana: 'サケカンキ',
    category: mockProductCategories[7], categoryId: '8', unit: '台',
    unitPrice: 140000, costPrice: 88000, taxRate: 10,
    description: 'W200×D390×H388', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: '73', code: 'P073', name: '給湯ポット（5ℓ）', nameKana: 'キュウトウポット',
    category: mockProductCategories[7], categoryId: '8', unit: '台',
    unitPrice: 29000, costPrice: 18000, taxRate: 10,
    description: 'W234×D302×H387', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: '74', code: 'P074', name: 'タオルウォーマー', nameKana: 'タオルウォーマー',
    category: mockProductCategories[7], categoryId: '8', unit: '台',
    unitPrice: 50000, costPrice: 31000, taxRate: 10,
    description: 'W350×D275×H290', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-10T00:00:00.000Z',
  },

  // --- 工事・サービス (categoryId: 9) ---
  {
    id: '80', code: 'W001', name: '機器運搬及び現場搬入費', nameKana: 'キキウンパン',
    category: mockProductCategories[8], categoryId: '9', unit: '式',
    unitPrice: 80000, costPrice: 50000, taxRate: 10,
    description: '※規模に応じて見積調整', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: '81', code: 'W002', name: '現場据付費及び取付費', nameKana: 'ゲンバスエツケ',
    category: mockProductCategories[8], categoryId: '9', unit: '式',
    unitPrice: 120000, costPrice: 75000, taxRate: 10,
    description: '※規模に応じて見積調整', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: '82', code: 'W003', name: '試運転調整及び諸経費', nameKana: 'シウンテンチョウセイ',
    category: mockProductCategories[8], categoryId: '9', unit: '式',
    unitPrice: 50000, costPrice: 31000, taxRate: 10,
    description: '※規模に応じて見積調整', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: '83', code: 'W004', name: '既存機器撤去処分費', nameKana: 'キゾンキキテッキョ',
    category: mockProductCategories[8], categoryId: '9', unit: '式',
    unitPrice: 280000, costPrice: 175000, taxRate: 10,
    description: '※規模に応じて見積調整', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: '84', code: 'W005', name: '出張費', nameKana: 'シュッチョウヒ',
    category: mockProductCategories[8], categoryId: '9', unit: '式',
    unitPrice: 15000, costPrice: 10000, taxRate: 10,
    description: '近畿圏内', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: '85', code: 'W006', name: 'ガスコンロ バーナー交換（5口分）', nameKana: 'バーナーコウカン',
    category: mockProductCategories[8], categoryId: '9', unit: '式',
    unitPrice: 125000, costPrice: 78000, taxRate: 10,
    description: '部品代・技術料含む', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: '86', code: 'W007', name: 'フライヤー サーモスタット交換', nameKana: 'サーモスタットコウカン',
    category: mockProductCategories[8], categoryId: '9', unit: '式',
    unitPrice: 45000, costPrice: 28000, taxRate: 10,
    description: '部品代・技術料含む', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: '87', code: 'W008', name: 'ガス配管点検・調整', nameKana: 'ガスハイカンテンケン',
    category: mockProductCategories[8], categoryId: '9', unit: '式',
    unitPrice: 35000, costPrice: 22000, taxRate: 10,
    description: null, isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
  },

  // --- コンベヤー・搬送機器 (categoryId: 10) ---
  {
    id: '90', code: 'CV01', name: '搬送コンベヤー SUS304 600W×5000L', nameKana: 'ハンソウコンベヤー',
    category: mockProductCategories[9], categoryId: '10', unit: '台',
    unitPrice: 3927000, costPrice: 3350000, taxRate: 10,
    description: 'ベルト巾600W×長さ5000L SUS304 ベルト緩め機能・ガイドH100・運転操作盤付き', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: '91', code: 'CV02', name: '中継コンベヤー SUS304 600W×2250L', nameKana: 'チュウケイコンベヤー',
    category: mockProductCategories[9], categoryId: '10', unit: '台',
    unitPrice: 2640000, costPrice: 2180000, taxRate: 10,
    description: 'ベルト巾600W×長さ2250L SUS304 ベルト緩め機能・ガイドH100・運転操作盤付き', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: '92', code: 'CV03', name: '搬送コンベヤー SUS304 600W×7670L', nameKana: 'ハンソウコンベヤー',
    category: mockProductCategories[9], categoryId: '10', unit: '台',
    unitPrice: 4664000, costPrice: 4020000, taxRate: 10,
    description: 'ベルト巾600W×長さ7670L SUS304 ベルト緩め機能・ガイドH100・運転操作盤付き', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: '93', code: 'CV04', name: '傾斜搬送コンベヤー SUS304 600W×6000L', nameKana: 'ケイシャハンソウコンベヤー',
    category: mockProductCategories[9], categoryId: '10', unit: '台',
    unitPrice: 4740000, costPrice: 4088000, taxRate: 10,
    description: 'ベルト巾600W×長さ6000L SUS304 入口H800→出口H1400（傾斜）キャスター・運転操作盤付き', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: '94', code: 'CV05', name: '計量コンベヤー前搬送コンベヤー SUS304 600W×3530L', nameKana: 'ケイリョウコンベヤー',
    category: mockProductCategories[9], categoryId: '10', unit: '台',
    unitPrice: 2976000, costPrice: 2485000, taxRate: 10,
    description: 'ベルト巾600W×長さ3530L SUS304 キャスター・運転操作盤付き', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: '95', code: 'CV06', name: '傾斜搬送コンベヤー SUS304 600W×6130L', nameKana: 'ケイシャハンソウコンベヤー',
    category: mockProductCategories[9], categoryId: '10', unit: '台',
    unitPrice: 3840000, costPrice: 3270000, taxRate: 10,
    description: 'ベルト巾600W×長さ6130L SUS304 入口H900→出口H300（傾斜3〜5°）運転操作盤付き', isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z',
  },
];

// ---------- レスポンス ----------

export const mockCustomersResponse: CustomersResponse = {
  customers: mockCustomers,
  total: mockCustomers.length,
};

export const mockProductsResponse: ProductsResponse = {
  products: mockProducts,
  total: mockProducts.length,
};

export const mockProductCategoriesResponse: ProductCategoriesResponse = {
  categories: mockProductCategories,
};
