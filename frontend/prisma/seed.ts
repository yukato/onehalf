import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 本番環境のAdminユーザーをシード（ハッシュ化されたパスワードをそのまま使用）
  await seedAdminUsers();

  // 企業とユーザーのシード
  await seedCompanies();

  // 会社モジュールのシード
  await seedCompanyModules();

  // プランのシード
  const plans = [
    { code: 'free', name: 'フリー', sortOrder: 1 },
    { code: 'gold', name: 'ゴールド', sortOrder: 2 },
    { code: 'platinum', name: 'プラチナ', sortOrder: 3 },
    { code: 'black', name: 'ブラック', sortOrder: 4 },
  ];

  console.log('\nCreating plans...');
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: { name: plan.name, sortOrder: plan.sortOrder },
      create: plan,
    });
  }
  console.log(`Created/Updated ${plans.length} plans`);

  // 職業のシード
  const occupations = [
    { name: '会社員', sortOrder: 1 },
    { name: '公務員', sortOrder: 2 },
    { name: '経営者・役員', sortOrder: 3 },
    { name: '自営業', sortOrder: 4 },
    { name: '医師', sortOrder: 5 },
    { name: '弁護士', sortOrder: 6 },
    { name: '会計士・税理士', sortOrder: 7 },
    { name: 'IT・エンジニア', sortOrder: 8 },
    { name: '金融・保険', sortOrder: 9 },
    { name: 'コンサルタント', sortOrder: 10 },
    { name: 'クリエイター・デザイナー', sortOrder: 11 },
    { name: '教育関係', sortOrder: 12 },
    { name: '医療関係（医師以外）', sortOrder: 13 },
    { name: '学生', sortOrder: 14 },
    { name: 'その他', sortOrder: 99 },
  ];

  console.log('Creating occupations...');
  for (const occupation of occupations) {
    const existing = await prisma.occupation.findFirst({
      where: { name: occupation.name },
    });
    if (!existing) {
      await prisma.occupation.create({ data: occupation });
    }
  }
  console.log(`Created ${occupations.length} occupations`);

  // 都道府県のシード
  const prefectures = [
    { name: '北海道', sortOrder: 1 },
    { name: '青森県', sortOrder: 2 },
    { name: '岩手県', sortOrder: 3 },
    { name: '宮城県', sortOrder: 4 },
    { name: '秋田県', sortOrder: 5 },
    { name: '山形県', sortOrder: 6 },
    { name: '福島県', sortOrder: 7 },
    { name: '茨城県', sortOrder: 8 },
    { name: '栃木県', sortOrder: 9 },
    { name: '群馬県', sortOrder: 10 },
    { name: '埼玉県', sortOrder: 11 },
    { name: '千葉県', sortOrder: 12 },
    { name: '東京都', sortOrder: 13 },
    { name: '神奈川県', sortOrder: 14 },
    { name: '新潟県', sortOrder: 15 },
    { name: '富山県', sortOrder: 16 },
    { name: '石川県', sortOrder: 17 },
    { name: '福井県', sortOrder: 18 },
    { name: '山梨県', sortOrder: 19 },
    { name: '長野県', sortOrder: 20 },
    { name: '岐阜県', sortOrder: 21 },
    { name: '静岡県', sortOrder: 22 },
    { name: '愛知県', sortOrder: 23 },
    { name: '三重県', sortOrder: 24 },
    { name: '滋賀県', sortOrder: 25 },
    { name: '京都府', sortOrder: 26 },
    { name: '大阪府', sortOrder: 27 },
    { name: '兵庫県', sortOrder: 28 },
    { name: '奈良県', sortOrder: 29 },
    { name: '和歌山県', sortOrder: 30 },
    { name: '鳥取県', sortOrder: 31 },
    { name: '島根県', sortOrder: 32 },
    { name: '岡山県', sortOrder: 33 },
    { name: '広島県', sortOrder: 34 },
    { name: '山口県', sortOrder: 35 },
    { name: '徳島県', sortOrder: 36 },
    { name: '香川県', sortOrder: 37 },
    { name: '愛媛県', sortOrder: 38 },
    { name: '高知県', sortOrder: 39 },
    { name: '福岡県', sortOrder: 40 },
    { name: '佐賀県', sortOrder: 41 },
    { name: '長崎県', sortOrder: 42 },
    { name: '熊本県', sortOrder: 43 },
    { name: '大分県', sortOrder: 44 },
    { name: '宮崎県', sortOrder: 45 },
    { name: '鹿児島県', sortOrder: 46 },
    { name: '沖縄県', sortOrder: 47 },
  ];

  console.log('Creating prefectures...');
  for (const prefecture of prefectures) {
    await prisma.prefecture.upsert({
      where: { name: prefecture.name },
      update: { sortOrder: prefecture.sortOrder },
      create: prefecture,
    });
  }
  console.log(`Created/Updated ${prefectures.length} prefectures`);

  // ダミーユーザーデータの生成
  await seedDummyUsers();

  // レストラン（マッチング会場）のシード
  await seedMatchingVenues();

  // ユーザー希望条件タイプのシード
  await seedUserPreferenceTypes();

  // ユーザー属性タイプのシード
  await seedUserAttributeTypes();

  // 面談種類と面談のシード
  await seedInterviewTypes();
  await seedInterviews();

  // マッチングのシード
  await seedMatchings();

  // フィードバック評価観点のシード
  await seedFeedbackCriteriaTypes();

  // ユーザー属性、希望条件、希望時間のシード
  await seedUserAttributes();
  await seedUserPreferences();
  await seedUserAvailabilityPatterns();
}

async function seedAdminUsers() {
  // 既存管理者数を確認
  const existingCount = await prisma.adminUser.count();
  if (existingCount > 0) {
    console.log(`Admin users already exist (${existingCount} records), skipping...`);
    return;
  }

  console.log('Creating admin users...');

  const adminUsers = [
    {
      email: 'm.yukato@gmail.com',
      username: 'Yuki Kato',
      password: '$2b$12$rhrtdLIq9/LxGyiiu1ytA.rF0vCrUGqUjbmhZJNTJ3akhqBbxEgqe', // 12345678
      role: 'super_admin',
      isActive: true,
    },
  ];

  for (const admin of adminUsers) {
    await prisma.adminUser.create({ data: admin });
  }

  console.log(`Created ${adminUsers.length} admin users`);
}

async function seedCompanies() {
  // 既存会社数を確認
  const existingCount = await prisma.company.count();
  if (existingCount > 0) {
    console.log(`Companies already exist (${existingCount} records), skipping...`);
    return;
  }

  console.log('Creating companies and company users...');

  // パスワード: 12345678 (bcrypt hash, cost 12)
  const hashedPassword = '$2b$12$rhrtdLIq9/LxGyiiu1ytA.rF0vCrUGqUjbmhZJNTJ3akhqBbxEgqe';

  // 株式会社八木厨房機器製作所
  const yagichu = await prisma.company.create({
    data: {
      name: '株式会社八木厨房機器製作所',
      slug: 'yagichu',
      isActive: true,
    },
  });

  await prisma.companyUser.create({
    data: {
      companyId: yagichu.id,
      email: 'admin@yagichu.com',
      username: '八木厨房 管理者',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    },
  });

  // 株式会社大寅水産
  const daitora = await prisma.company.create({
    data: {
      name: '株式会社大寅水産',
      slug: 'daitora',
      isActive: true,
    },
  });

  await prisma.companyUser.create({
    data: {
      companyId: daitora.id,
      email: 'admin@daitora.com',
      username: '大寅水産 管理者',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    },
  });

  console.log('Created 2 companies with users');
}

async function seedCompanyModules() {
  // 既存モジュール数を確認
  const existingCount = await prisma.companyModule.count();
  if (existingCount > 0) {
    console.log(`Company modules already exist (${existingCount} records), skipping...`);
    return;
  }

  console.log('Creating company modules...');

  const modules = [
    { name: 'ダッシュボード', slug: 'analytics', description: 'データ分析・可視化ダッシュボード', icon: 'chart', sortOrder: 0 },
    { name: '人材検索', slug: 'talent-search', description: 'AIを活用した人材検索・マッチング機能', icon: 'search', sortOrder: 1 },
    { name: '書類管理', slug: 'documents', description: '契約書・請求書などの書類管理機能', icon: 'document', sortOrder: 2 },
    { name: 'レポート', slug: 'reports', description: '各種レポートの自動生成機能', icon: 'report', sortOrder: 4 },
    { name: 'メッセージ', slug: 'messages', description: '社内外メッセージ・通知機能', icon: 'mail', sortOrder: 5 },
    { name: 'マスタ管理', slug: 'masters', description: '取引先・商品マスタの管理', icon: 'database', sortOrder: 10 },
    { name: '見積管理', slug: 'quotations', description: '見積書の作成・管理・承認ワークフロー', icon: 'receipt', sortOrder: 20 },
    { name: '受注管理', slug: 'orders', description: '受注・売上の管理', icon: 'chart', sortOrder: 30 },
    { name: '納品書', slug: 'delivery-notes', description: '納品書の発行・管理', icon: 'truck', sortOrder: 40 },
    { name: '請求管理', slug: 'invoices', description: '請求書の作成・入金管理', icon: 'money', sortOrder: 50 },
  ];

  const createdModules: Record<string, bigint> = {};
  for (const mod of modules) {
    const created = await prisma.companyModule.create({ data: mod });
    createdModules[mod.slug] = created.id;
  }

  console.log(`Created ${modules.length} company modules`);

  // 会社へのモジュール割り当て
  const yagichu = await prisma.company.findFirst({ where: { slug: 'yagichu' } });
  const daitora = await prisma.company.findFirst({ where: { slug: 'daitora' } });

  if (yagichu) {
    const yagichuModules = ['talent-search', 'documents', 'analytics', 'messages', 'masters', 'quotations', 'orders', 'delivery-notes', 'invoices'];
    for (const slug of yagichuModules) {
      await prisma.companyModuleAssignment.create({
        data: { companyId: yagichu.id, moduleId: createdModules[slug], isActive: true },
      });
    }
    console.log(`Assigned ${yagichuModules.length} modules to yagichu`);
  }

  if (daitora) {
    const daitoraModules = ['talent-search', 'analytics'];
    for (const slug of daitoraModules) {
      await prisma.companyModuleAssignment.create({
        data: { companyId: daitora.id, moduleId: createdModules[slug], isActive: true },
      });
    }
    console.log(`Assigned ${daitoraModules.length} modules to daitora`);
  }
}

async function seedDummyUsers() {
  // 既存ユーザー数を確認
  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    console.log(`Users already exist (${existingCount} records), skipping dummy user creation...`);
    return;
  }

  console.log('Creating dummy users...');

  // 姓のリスト
  const lastNames = [
    '佐藤',
    '鈴木',
    '高橋',
    '田中',
    '伊藤',
    '渡辺',
    '山本',
    '中村',
    '小林',
    '加藤',
    '吉田',
    '山田',
    '佐々木',
    '山口',
    '松本',
    '井上',
    '木村',
    '林',
    '斎藤',
    '清水',
    '山崎',
    '森',
    '池田',
    '橋本',
    '阿部',
    '石川',
    '前田',
    '小川',
    '藤田',
    '岡田',
    '後藤',
    '長谷川',
    '石井',
    '村上',
    '近藤',
    '坂本',
    '遠藤',
    '青木',
    '藤井',
    '西村',
    '福田',
    '太田',
    '三浦',
    '岡本',
    '松田',
    '中川',
    '中野',
    '原田',
    '小野',
    '田村',
  ];

  // 名（男性）のリスト
  const maleFirstNames = [
    '翔太',
    '大輝',
    '拓海',
    '海斗',
    '健太',
    '大樹',
    '悠斗',
    '颯太',
    '蓮',
    '優斗',
    '陽翔',
    '直樹',
    '雄大',
    '拓也',
    '健一',
    '翔',
    '大介',
    '洋平',
    '亮太',
    '達也',
    '隆',
    '誠',
    '浩二',
    '正樹',
    '和也',
    '俊介',
    '智也',
    '慶太',
    '祐介',
    '啓太',
  ];

  // 名（女性）のリスト
  const femaleFirstNames = [
    '美咲',
    'さくら',
    '葵',
    '陽菜',
    '結衣',
    '凛',
    '愛',
    '美優',
    '杏',
    '真央',
    '彩花',
    '美月',
    '萌',
    '優花',
    '菜々子',
    '結菜',
    '桜',
    '麻衣',
    '千尋',
    '明日香',
    '由美',
    '恵',
    '真由美',
    '香織',
    '裕子',
    '直美',
    '久美子',
    '智子',
    '由紀',
    '美穂',
  ];

  // マスターデータを取得
  const plansData = await prisma.plan.findMany();
  const occupationsData = await prisma.occupation.findMany();
  const prefecturesData = await prisma.prefecture.findMany();

  const planIds = plansData.map((p) => p.id);
  const occupationIds = occupationsData.map((o) => o.id);
  const prefectureIds = prefecturesData.map((p) => p.id);

  const statuses: ('pending' | 'approved' | 'withdrawn' | 'suspended')[] = [
    'approved',
    'approved',
    'approved',
    'approved',
    'approved', // 50%
    'approved',
    'approved',
    'approved',
    'pending',
    'pending', // 20%
    'withdrawn',
    'suspended', // 10% each
  ];

  // ランダム選択用ヘルパー
  const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const randomInt = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  // 100件のダミーユーザーを生成
  const dummyUsers = [];
  for (let i = 1; i <= 100; i++) {
    const gender = randomInt(1, 2);
    const lastName = randomItem(lastNames);
    const firstName = gender === 1 ? randomItem(maleFirstNames) : randomItem(femaleFirstNames);

    // 生年月日（25-45歳）
    const birthYear = randomInt(1980, 2000);
    const birthMonth = randomInt(1, 12);
    const birthDay = randomInt(1, 28);
    const birthday = new Date(birthYear, birthMonth - 1, birthDay);

    // プラン開始日（過去2年以内）
    const planStartYear = randomInt(2024, 2026);
    const planStartMonth = randomInt(1, 12);
    const planStartedAt = new Date(planStartYear, planStartMonth - 1, 1);

    dummyUsers.push({
      bdUserId: BigInt(10000 + i),
      lastName,
      firstName,
      gender,
      email: `user${i}@example.com`,
      mobileNumber: `090${randomInt(10000000, 99999999)}`,
      birthday,
      occupationId: randomItem(occupationIds),
      prefectureId: randomItem(prefectureIds),
      currentStatus: randomItem(statuses),
      planId: randomItem(planIds),
      planStartedAt,
      score: randomInt(50, 100),
    });
  }

  // バルクインサート
  await prisma.user.createMany({
    data: dummyUsers,
  });

  console.log(`Created ${dummyUsers.length} dummy users`);
}

async function seedMatchingVenues() {
  // 既存レストラン数を確認
  const existingCount = await prisma.matchingVenue.count();
  if (existingCount > 0) {
    console.log(`Venues already exist (${existingCount} records), skipping venue creation...`);
    return;
  }

  console.log('Creating matching venues (restaurants)...');

  // 都道府県IDを取得
  const tokyo = await prisma.prefecture.findFirst({ where: { name: '東京都' } });
  const kanagawa = await prisma.prefecture.findFirst({ where: { name: '神奈川県' } });
  const osaka = await prisma.prefecture.findFirst({ where: { name: '大阪府' } });

  const venues = [
    // 東京（恵比寿・代官山エリア）
    {
      name: 'リストランテ アルポルト',
      genre: 'イタリアン',
      phoneNumber: '03-3456-7890',
      postalCode: '150-0021',
      prefectureId: tokyo?.id,
      city: '渋谷区',
      address: '恵比寿西1-2-3 恵比寿ガーデンプレイス5F',
      googleMapUrl: 'https://maps.google.com/?q=恵比寿ガーデンプレイス',
      url: 'https://tabelog.com/tokyo/A1303/A130302/13000001/',
      notes: '個室あり。デートに最適。予約は2週間前推奨。',
      isActive: true,
    },
    {
      name: 'ラ・ターブル・ドゥ・ジョエル・ロブション',
      genre: 'フレンチ',
      phoneNumber: '03-5424-1347',
      postalCode: '150-0013',
      prefectureId: tokyo?.id,
      city: '渋谷区',
      address: '恵比寿4-20-2 恵比寿ガーデンプレイス内',
      googleMapUrl: 'https://maps.google.com/?q=ジョエルロブション恵比寿',
      url: 'https://www.robuchon.jp/',
      notes: 'ドレスコードあり（スマートカジュアル）。特別な日に。',
      isActive: true,
    },
    {
      name: '鉄板焼 恵比寿',
      genre: '鉄板焼き',
      phoneNumber: '03-3456-1234',
      postalCode: '150-0021',
      prefectureId: tokyo?.id,
      city: '渋谷区',
      address: '恵比寿西2-10-5 山田ビル3F',
      googleMapUrl: 'https://maps.google.com/?q=恵比寿駅',
      notes: 'カウンター席のみ。目の前で調理するスタイル。',
      isActive: true,
    },

    // 東京（銀座エリア）
    {
      name: '銀座 久兵衛',
      genre: '寿司',
      phoneNumber: '03-3571-6523',
      postalCode: '104-0061',
      prefectureId: tokyo?.id,
      city: '中央区',
      address: '銀座8-7-6 銀座並木通りビル',
      googleMapUrl: 'https://maps.google.com/?q=銀座久兵衛',
      url: 'https://www.kyubey.jp/',
      notes: '要予約。カウンター席がおすすめ。予算3万円〜',
      isActive: true,
    },
    {
      name: 'レストラン タテルヨシノ 銀座',
      genre: 'フレンチ',
      phoneNumber: '03-5537-5678',
      postalCode: '104-0061',
      prefectureId: tokyo?.id,
      city: '中央区',
      address: '銀座6-3-2 ギャラリーセンタービル12F',
      googleMapUrl: 'https://maps.google.com/?q=銀座タテルヨシノ',
      notes: '眺望が良い。記念日利用におすすめ。',
      isActive: true,
    },
    {
      name: '銀座 小十',
      genre: '日本料理',
      phoneNumber: '03-6215-8100',
      postalCode: '104-0061',
      prefectureId: tokyo?.id,
      city: '中央区',
      address: '銀座5-4-8 カリオカビル4F',
      googleMapUrl: 'https://maps.google.com/?q=銀座小十',
      notes: 'ミシュラン三つ星。完全予約制。',
      isActive: true,
    },

    // 東京（六本木・赤坂エリア）
    {
      name: 'ピエール・ガニェール',
      genre: 'フレンチ',
      phoneNumber: '03-4333-8781',
      postalCode: '107-0052',
      prefectureId: tokyo?.id,
      city: '港区',
      address: '赤坂1-12-33 ANAインターコンチネンタルホテル東京36F',
      googleMapUrl: 'https://maps.google.com/?q=ANAインターコンチネンタルホテル東京',
      notes: 'ホテル最上階。夜景が綺麗。ドレスコードあり。',
      isActive: true,
    },
    {
      name: '六本木 龍吟',
      genre: '日本料理',
      phoneNumber: '03-3423-8006',
      postalCode: '106-0032',
      prefectureId: tokyo?.id,
      city: '港区',
      address: '六本木7-17-24 サイドロッポンギ1F',
      googleMapUrl: 'https://maps.google.com/?q=龍吟六本木',
      notes: 'ミシュラン三つ星。1ヶ月前の予約推奨。',
      isActive: true,
    },
    {
      name: 'けやき坂',
      genre: '鉄板焼き',
      phoneNumber: '03-4333-8782',
      postalCode: '106-0032',
      prefectureId: tokyo?.id,
      city: '港区',
      address: '六本木6-10-1 六本木ヒルズ グランドハイアット東京6F',
      googleMapUrl: 'https://maps.google.com/?q=グランドハイアット東京',
      notes: 'ホテル内レストラン。神戸牛が絶品。',
      isActive: true,
    },

    // 東京（丸の内・東京駅エリア）
    {
      name: 'アピシウス',
      genre: 'フレンチ',
      phoneNumber: '03-3214-2200',
      postalCode: '100-0005',
      prefectureId: tokyo?.id,
      city: '千代田区',
      address: '丸の内1-9-1 有楽町駅前ビル地下1階',
      googleMapUrl: 'https://maps.google.com/?q=アピシウス有楽町',
      notes: 'ワインセラーが充実。クラシックな雰囲気。',
      isActive: true,
    },
    {
      name: 'シグネチャー',
      genre: 'フレンチ',
      phoneNumber: '03-5323-3458',
      postalCode: '100-0005',
      prefectureId: tokyo?.id,
      city: '千代田区',
      address: '丸の内1-8-3 マンダリンオリエンタル東京37F',
      googleMapUrl: 'https://maps.google.com/?q=マンダリンオリエンタル東京',
      notes: '東京の夜景を一望。プロポーズにも。',
      isActive: true,
    },

    // 横浜
    {
      name: 'ラ・マーレ・ド・茶屋',
      genre: 'フレンチ',
      phoneNumber: '045-681-5678',
      postalCode: '231-0023',
      prefectureId: kanagawa?.id,
      city: '横浜市中区',
      address: '山下町1-2 横浜港大さん橋',
      googleMapUrl: 'https://maps.google.com/?q=横浜大さん橋',
      notes: '港を望むロケーション。サンセットタイムがおすすめ。',
      isActive: true,
    },
    {
      name: '崎陽軒本店 嘉宮',
      genre: '中華',
      phoneNumber: '045-441-8880',
      postalCode: '220-0011',
      prefectureId: kanagawa?.id,
      city: '横浜市西区',
      address: '高島2-13-12',
      googleMapUrl: 'https://maps.google.com/?q=崎陽軒本店',
      notes: '横浜の老舗。個室あり。',
      isActive: true,
    },

    // 大阪
    {
      name: 'ラ・ベ',
      genre: 'フレンチ',
      phoneNumber: '06-6343-7020',
      postalCode: '530-0001',
      prefectureId: osaka?.id,
      city: '大阪市北区',
      address: '梅田3-2-4 リッツカールトン大阪5F',
      googleMapUrl: 'https://maps.google.com/?q=リッツカールトン大阪',
      notes: 'ミシュラン一つ星。ホテルダイニング。',
      isActive: true,
    },
    {
      name: '弧柳',
      genre: '日本料理',
      phoneNumber: '06-6231-2201',
      postalCode: '542-0081',
      prefectureId: osaka?.id,
      city: '大阪市中央区',
      address: '南船場4-5-1 心斎橋アーバンライフビル',
      googleMapUrl: 'https://maps.google.com/?q=心斎橋弧柳',
      notes: 'ミシュラン三つ星。完全予約制。',
      isActive: true,
    },

    // 非アクティブ（閉店・休業中など）
    {
      name: '旧レストラン ABC（閉店）',
      genre: 'イタリアン',
      phoneNumber: null,
      postalCode: '150-0001',
      prefectureId: tokyo?.id,
      city: '渋谷区',
      address: '神宮前1-1-1',
      googleMapUrl: null,
      url: null,
      notes: '2024年閉店。履歴用に残存。',
      isActive: false,
    },
  ];

  for (const venue of venues) {
    await prisma.matchingVenue.create({
      data: venue,
    });
  }

  console.log(`Created ${venues.length} matching venues`);
}

async function seedUserPreferenceTypes() {
  console.log('Creating user preference types...');

  const preferenceTypes = [
    {
      code: 'desired_age',
      name: '希望年齢',
      fieldType: 'range',
      options: { unit: '歳', min: 20, max: 60, step: 1 },
      targetGender: null, // 両方
      sortOrder: 1,
    },
    {
      code: 'desired_income',
      name: '希望年収',
      fieldType: 'range',
      options: {
        unit: '万円',
        min: 0,
        max: 3000,
        step: 100,
        labels: { 0: '指定なし', 3000: '3000万円以上' },
      },
      targetGender: 2, // 女性向け（相手の男性の年収を希望）
      sortOrder: 2,
    },
    {
      code: 'desired_occupation',
      name: '希望職業',
      fieldType: 'multiSelect',
      options: {
        choices: [
          '会社員',
          '公務員',
          '経営者・役員',
          '自営業',
          '医師',
          '弁護士',
          '会計士・税理士',
          'IT・エンジニア',
          '金融・保険',
          'コンサルタント',
          'クリエイター・デザイナー',
          '教育関係',
          '医療関係（医師以外）',
          'その他',
        ],
      },
      targetGender: null,
      sortOrder: 3,
    },
    {
      code: 'desired_education',
      name: '希望学歴',
      fieldType: 'select',
      options: {
        choices: [
          '指定なし',
          '高卒以上',
          '専門学校卒以上',
          '短大卒以上',
          '大卒以上',
          '大学院卒以上',
        ],
      },
      targetGender: null,
      sortOrder: 4,
    },
    {
      code: 'desired_location',
      name: '希望居住地',
      fieldType: 'multiSelect',
      options: {
        choices: [
          '北海道',
          '東北（青森・岩手・宮城・秋田・山形・福島）',
          '関東（東京・神奈川・千葉・埼玉・茨城・栃木・群馬）',
          '東京都',
          '神奈川県',
          '千葉県',
          '埼玉県',
          '中部（新潟・富山・石川・福井・山梨・長野・岐阜・静岡・愛知）',
          '愛知県',
          '関西（三重・滋賀・京都・大阪・兵庫・奈良・和歌山）',
          '大阪府',
          '京都府',
          '兵庫県',
          '中国・四国',
          '九州・沖縄',
          '海外',
        ],
      },
      targetGender: null,
      sortOrder: 5,
    },
    {
      code: 'desired_height',
      name: '希望身長',
      fieldType: 'range',
      options: { unit: 'cm', min: 140, max: 200, step: 1 },
      targetGender: null,
      sortOrder: 6,
    },
    {
      code: 'desired_smoking',
      name: '喫煙について',
      fieldType: 'select',
      options: {
        choices: ['指定なし', '吸わない人', '吸わない人（加熱式はOK）', '喫煙者でもOK'],
      },
      targetGender: null,
      sortOrder: 7,
    },
    {
      code: 'desired_drinking',
      name: '飲酒について',
      fieldType: 'select',
      options: {
        choices: ['指定なし', '飲まない人', '時々飲む程度', 'お酒好きな人', 'どちらでもOK'],
      },
      targetGender: null,
      sortOrder: 8,
    },
    {
      code: 'desired_marriage_history',
      name: '婚姻歴について',
      fieldType: 'select',
      options: {
        choices: ['指定なし', '初婚の方', '再婚でもOK', '子供がいなければOK'],
      },
      targetGender: null,
      sortOrder: 9,
    },
    {
      code: 'desired_other',
      name: 'その他の希望',
      fieldType: 'text',
      options: { maxLength: 1000, placeholder: 'その他、お相手に求める条件があればご記入ください' },
      targetGender: null,
      sortOrder: 99,
    },
  ];

  for (const pt of preferenceTypes) {
    await prisma.userPreferenceType.upsert({
      where: { code: pt.code },
      update: {
        name: pt.name,
        fieldType: pt.fieldType,
        options: pt.options,
        targetGender: pt.targetGender,
        sortOrder: pt.sortOrder,
      },
      create: {
        code: pt.code,
        name: pt.name,
        fieldType: pt.fieldType,
        options: pt.options,
        targetGender: pt.targetGender,
        sortOrder: pt.sortOrder,
        isActive: true,
      },
    });
  }

  console.log(`Created/Updated ${preferenceTypes.length} user preference types`);
}

async function seedUserAttributeTypes() {
  console.log('Creating user attribute types...');

  const attributeTypes = [
    {
      code: 'income',
      name: '年収',
      fieldType: 'select',
      options: {
        choices: [
          '300万円未満',
          '300〜400万円',
          '400〜500万円',
          '500〜600万円',
          '600〜800万円',
          '800〜1000万円',
          '1000〜1500万円',
          '1500〜2000万円',
          '2000万円以上',
        ],
      },
      targetGender: 1, // 男性のみ必須（女性は任意）
      relatedPreferenceCode: 'desired_income',
      sortOrder: 1,
    },
    {
      code: 'education',
      name: '学歴',
      fieldType: 'select',
      options: {
        choices: ['高卒', '専門学校卒', '短大卒', '大卒', '大学院卒'],
      },
      targetGender: null,
      relatedPreferenceCode: 'desired_education',
      sortOrder: 2,
    },
    {
      code: 'height',
      name: '身長',
      fieldType: 'select',
      options: {
        choices: [
          '140cm以下',
          '141〜145cm',
          '146〜150cm',
          '151〜155cm',
          '156〜160cm',
          '161〜165cm',
          '166〜170cm',
          '171〜175cm',
          '176〜180cm',
          '181〜185cm',
          '186〜190cm',
          '191cm以上',
        ],
      },
      targetGender: null,
      relatedPreferenceCode: 'desired_height',
      sortOrder: 3,
    },
    {
      code: 'smoking',
      name: '喫煙',
      fieldType: 'select',
      options: {
        choices: ['吸わない', '加熱式のみ', '吸う'],
      },
      targetGender: null,
      relatedPreferenceCode: 'desired_smoking',
      sortOrder: 4,
    },
    {
      code: 'drinking',
      name: '飲酒',
      fieldType: 'select',
      options: {
        choices: ['飲まない', '時々飲む', 'よく飲む'],
      },
      targetGender: null,
      relatedPreferenceCode: 'desired_drinking',
      sortOrder: 5,
    },
    {
      code: 'marriage_history',
      name: '婚姻歴',
      fieldType: 'select',
      options: {
        choices: ['未婚', '離婚', '死別'],
      },
      targetGender: null,
      relatedPreferenceCode: 'desired_marriage_history',
      sortOrder: 6,
    },
    {
      code: 'has_children',
      name: '子供の有無',
      fieldType: 'select',
      options: {
        choices: ['いない', 'いる（同居）', 'いる（別居）'],
      },
      targetGender: null,
      relatedPreferenceCode: 'desired_marriage_history',
      sortOrder: 7,
    },
    {
      code: 'body_type',
      name: '体型',
      fieldType: 'select',
      options: {
        choices: [
          'スリム',
          'やや細め',
          '普通',
          'がっちり',
          'ややぽっちゃり',
          'ぽっちゃり',
          'マッチョ',
        ],
      },
      targetGender: null,
      relatedPreferenceCode: null,
      sortOrder: 8,
    },
    {
      code: 'holiday',
      name: '休日',
      fieldType: 'select',
      options: {
        choices: ['土日祝', '平日', 'シフト制', '不定期'],
      },
      targetGender: null,
      relatedPreferenceCode: null,
      sortOrder: 9,
    },
    {
      code: 'want_children',
      name: '子供の希望',
      fieldType: 'select',
      options: {
        choices: ['欲しい', '相手次第', '欲しくない'],
      },
      targetGender: null,
      relatedPreferenceCode: null,
      sortOrder: 10,
    },
    {
      code: 'hobbies',
      name: '趣味',
      fieldType: 'multiSelect',
      options: {
        choices: [
          '旅行',
          'グルメ・食べ歩き',
          '映画鑑賞',
          '音楽',
          '読書',
          'スポーツ観戦',
          'ジム・筋トレ',
          'ランニング・ジョギング',
          'ゴルフ',
          'テニス',
          'ヨガ・ピラティス',
          'アウトドア・キャンプ',
          '料理',
          'カフェ巡り',
          'お酒・バー巡り',
          'アート・美術館',
          'ゲーム',
          'アニメ・漫画',
          'ペット',
          'ドライブ',
          'ショッピング',
          '写真・カメラ',
        ],
      },
      targetGender: null,
      relatedPreferenceCode: null,
      sortOrder: 11,
    },
    {
      code: 'personality',
      name: '性格・タイプ',
      fieldType: 'multiSelect',
      options: {
        choices: [
          '穏やか',
          '社交的',
          '真面目',
          'ユーモアがある',
          '優しい',
          '決断力がある',
          'アクティブ',
          'インドア派',
          '几帳面',
          'マイペース',
          '聞き上手',
          '話し上手',
          '知的',
          '情熱的',
          '冷静',
          '素直',
        ],
      },
      targetGender: null,
      relatedPreferenceCode: null,
      sortOrder: 12,
    },
    {
      code: 'mbti',
      name: 'MBTIタイプ',
      fieldType: 'select',
      options: {
        choices: [
          'INTJ（建築家）',
          'INTP（論理学者）',
          'ENTJ（指揮官）',
          'ENTP（討論者）',
          'INFJ（提唱者）',
          'INFP（仲介者）',
          'ENFJ（主人公）',
          'ENFP（広報運動家）',
          'ISTJ（管理者）',
          'ISFJ（擁護者）',
          'ESTJ（幹部）',
          'ESFJ（領事官）',
          'ISTP（巨匠）',
          'ISFP（冒険家）',
          'ESTP（起業家）',
          'ESFP（エンターテイナー）',
        ],
      },
      targetGender: null,
      relatedPreferenceCode: null,
      sortOrder: 13,
    },
  ];

  for (const at of attributeTypes) {
    await prisma.userAttributeType.upsert({
      where: { code: at.code },
      update: {
        name: at.name,
        fieldType: at.fieldType,
        options: at.options,
        targetGender: at.targetGender,
        relatedPreferenceCode: at.relatedPreferenceCode,
        sortOrder: at.sortOrder,
        isActive: true,
      },
      create: {
        name: at.name,
        code: at.code,
        fieldType: at.fieldType,
        options: at.options,
        targetGender: at.targetGender,
        relatedPreferenceCode: at.relatedPreferenceCode,
        sortOrder: at.sortOrder,
        isActive: true,
      },
    });
  }

  console.log(`Created/Updated ${attributeTypes.length} user attribute types`);
}

async function seedInterviewTypes() {
  console.log('Creating interview types...');

  const interviewTypes = [
    {
      code: 'initial_male',
      name: '初回面談（男性）',
      durationMinutes: 60,
      targetGender: 1, // 男性
      sortOrder: 1,
      isActive: true,
    },
    {
      code: 'initial_female',
      name: '初回面談（女性）',
      durationMinutes: 60,
      targetGender: 2, // 女性
      sortOrder: 2,
      isActive: true,
    },
    {
      code: 'followup',
      name: 'フォローアップ面談',
      durationMinutes: 30,
      targetGender: null, // 共通
      sortOrder: 3,
      isActive: true,
    },
    {
      code: 'plan_consultation',
      name: 'プラン相談',
      durationMinutes: 45,
      targetGender: null,
      sortOrder: 4,
      isActive: true,
    },
    {
      code: 'feedback',
      name: 'マッチング後フィードバック',
      durationMinutes: 30,
      targetGender: null,
      sortOrder: 5,
      isActive: true,
    },
    {
      code: 'upgrade',
      name: 'アップグレード相談',
      durationMinutes: 30,
      targetGender: null,
      sortOrder: 6,
      isActive: true,
    },
  ];

  for (const type of interviewTypes) {
    await prisma.interviewType.upsert({
      where: { code: type.code },
      update: {
        name: type.name,
        durationMinutes: type.durationMinutes,
        targetGender: type.targetGender,
        sortOrder: type.sortOrder,
        isActive: type.isActive,
      },
      create: type,
    });
  }

  console.log(`Created/Updated ${interviewTypes.length} interview types`);
}

async function seedInterviews() {
  // 既存面談数を確認
  const existingCount = await prisma.interview.count();
  if (existingCount > 0) {
    console.log(
      `Interviews already exist (${existingCount} records), skipping interview creation...`
    );
    return;
  }

  console.log('Creating sample interviews...');

  // 管理者を取得
  const admin = await prisma.adminUser.findFirst({ where: { isActive: true } });
  if (!admin) {
    console.log('No admin user found, skipping interview creation...');
    return;
  }

  // 面談種類を取得
  const interviewTypes = await prisma.interviewType.findMany();
  const initialMale = interviewTypes.find((t) => t.code === 'initial_male');
  const initialFemale = interviewTypes.find((t) => t.code === 'initial_female');
  const followup = interviewTypes.find((t) => t.code === 'followup');
  const planConsultation = interviewTypes.find((t) => t.code === 'plan_consultation');
  const feedback = interviewTypes.find((t) => t.code === 'feedback');

  // ユーザーを取得（メールで紐付けるため）
  const users = await prisma.user.findMany({ take: 30 });

  // ランダム選択用ヘルパー
  const randomInt = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  // サンプル面談データ
  const interviews: {
    interviewTypeId: bigint;
    userId: bigint | null;
    adminUserId: bigint;
    guestName: string;
    guestEmail: string | null;
    guestPhone: string | null;
    scheduledAt: Date;
    durationMinutes: number;
    meetingUrl: string | null;
    currentStatus: string;
    notes: string | null;
  }[] = [];

  // 過去の完了した面談（ユーザー紐付けあり）
  for (let i = 0; i < 15; i++) {
    const user = users[i % users.length];
    const daysAgo = randomInt(7, 60);
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() - daysAgo);
    scheduledAt.setHours(randomInt(10, 18), randomInt(0, 1) * 30, 0, 0);

    const type = user.gender === 1 ? initialMale : initialFemale;

    interviews.push({
      interviewTypeId: type?.id || interviewTypes[0].id,
      userId: user.id,
      adminUserId: admin.id,
      guestName: `${user.lastName} ${user.firstName}`,
      guestEmail: user.email,
      guestPhone: user.mobileNumber,
      scheduledAt,
      durationMinutes: type?.durationMinutes || 60,
      meetingUrl: `https://zoom.us/j/${randomInt(1000000000, 9999999999)}`,
      currentStatus: 'completed',
      notes: `初回面談完了。${user.gender === 1 ? '男性' : '女性'}会員として登録済み。`,
    });
  }

  // 予定されている面談（ユーザー紐付けあり）
  for (let i = 15; i < 25; i++) {
    const user = users[i % users.length];
    const daysLater = randomInt(1, 14);
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + daysLater);
    scheduledAt.setHours(randomInt(10, 18), randomInt(0, 1) * 30, 0, 0);

    const typeOptions = [followup, planConsultation, feedback].filter(Boolean);
    const type = typeOptions[randomInt(0, typeOptions.length - 1)];

    interviews.push({
      interviewTypeId: type?.id || interviewTypes[0].id,
      userId: user.id,
      adminUserId: admin.id,
      guestName: `${user.lastName} ${user.firstName}`,
      guestEmail: user.email,
      guestPhone: user.mobileNumber,
      scheduledAt,
      durationMinutes: type?.durationMinutes || 30,
      meetingUrl: `https://zoom.us/j/${randomInt(1000000000, 9999999999)}`,
      currentStatus: 'scheduled',
      notes: null,
    });
  }

  // 新規問い合わせ（まだユーザー登録前、紐付けなし）
  const newInquiryNames = [
    { lastName: '山田', firstName: '花子', gender: 2 },
    { lastName: '佐藤', firstName: '健太', gender: 1 },
    { lastName: '田中', firstName: '美咲', gender: 2 },
    { lastName: '鈴木', firstName: '大輔', gender: 1 },
    { lastName: '高橋', firstName: '真由美', gender: 2 },
    { lastName: '伊藤', firstName: '拓也', gender: 1 },
    { lastName: '渡辺', firstName: '愛', gender: 2 },
    { lastName: '小林', firstName: '翔', gender: 1 },
  ];

  for (let i = 0; i < newInquiryNames.length; i++) {
    const inquiry = newInquiryNames[i];
    const daysLater = randomInt(1, 21);
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + daysLater);
    scheduledAt.setHours(randomInt(10, 18), randomInt(0, 1) * 30, 0, 0);

    const type = inquiry.gender === 1 ? initialMale : initialFemale;

    interviews.push({
      interviewTypeId: type?.id || interviewTypes[0].id,
      userId: null, // まだ紐付けなし
      adminUserId: admin.id,
      guestName: `${inquiry.lastName} ${inquiry.firstName}`,
      guestEmail: `${inquiry.lastName.toLowerCase()}${inquiry.firstName.toLowerCase()}@gmail.com`,
      guestPhone: `090${randomInt(10000000, 99999999)}`,
      scheduledAt,
      durationMinutes: type?.durationMinutes || 60,
      meetingUrl: `https://zoom.us/j/${randomInt(1000000000, 9999999999)}`,
      currentStatus: 'scheduled',
      notes: 'Webサイトからの新規問い合わせ。',
    });
  }

  // キャンセルされた面談
  for (let i = 0; i < 3; i++) {
    const user = users[(25 + i) % users.length];
    const daysAgo = randomInt(1, 14);
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() - daysAgo);
    scheduledAt.setHours(randomInt(10, 18), randomInt(0, 1) * 30, 0, 0);

    interviews.push({
      interviewTypeId: followup?.id || interviewTypes[0].id,
      userId: user.id,
      adminUserId: admin.id,
      guestName: `${user.lastName} ${user.firstName}`,
      guestEmail: user.email,
      guestPhone: user.mobileNumber,
      scheduledAt,
      durationMinutes: 30,
      meetingUrl: `https://zoom.us/j/${randomInt(1000000000, 9999999999)}`,
      currentStatus: 'cancelled',
      notes: '会員都合によりキャンセル。',
    });
  }

  // 無断キャンセル
  for (let i = 0; i < 2; i++) {
    const daysAgo = randomInt(3, 10);
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() - daysAgo);
    scheduledAt.setHours(randomInt(10, 18), randomInt(0, 1) * 30, 0, 0);

    interviews.push({
      interviewTypeId: initialFemale?.id || interviewTypes[0].id,
      userId: null,
      adminUserId: admin.id,
      guestName: i === 0 ? '木村 さやか' : '中村 あかり',
      guestEmail: i === 0 ? 'sayaka.k@example.com' : 'akari.n@example.com',
      guestPhone: `080${randomInt(10000000, 99999999)}`,
      scheduledAt,
      durationMinutes: 60,
      meetingUrl: `https://zoom.us/j/${randomInt(1000000000, 9999999999)}`,
      currentStatus: 'no_show',
      notes: '連絡なしで不参加。フォローアップメール送信済み。',
    });
  }

  // バルクインサート
  await prisma.interview.createMany({
    data: interviews,
  });

  console.log(`Created ${interviews.length} sample interviews`);
}

async function seedMatchings() {
  // 既存マッチング数を確認
  const existingCount = await prisma.matching.count();
  if (existingCount > 0) {
    console.log(
      `Matchings already exist (${existingCount} records), skipping matching creation...`
    );
    return;
  }

  console.log('Creating sample matchings...');

  // 管理者を取得
  const admin = await prisma.adminUser.findFirst({ where: { isActive: true } });
  if (!admin) {
    console.log('No admin user found, skipping matching creation...');
    return;
  }

  // 男性ユーザーと女性ユーザーを取得
  const maleUsers = await prisma.user.findMany({
    where: { gender: 1, currentStatus: 'approved' },
  });
  const femaleUsers = await prisma.user.findMany({
    where: { gender: 2, currentStatus: 'approved' },
  });

  if (maleUsers.length === 0 || femaleUsers.length === 0) {
    console.log('No users found for matching, skipping...');
    return;
  }

  // 会場を取得
  const venues = await prisma.matchingVenue.findMany({
    where: { isActive: true },
  });

  // ランダム選択用ヘルパー
  const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const randomInt = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  // ステータスの分布
  const statuses = [
    'completed',
    'completed',
    'completed',
    'completed', // 40%
    'confirmed',
    'confirmed',
    'confirmed', // 30%
    'pending',
    'pending', // 20%
    'cancelled', // 10%
  ];

  // 2026年2月のマッチングを100件作成
  const matchings: {
    maleUserId: bigint;
    femaleUserId: bigint;
    startAt: Date;
    endAt: Date;
    currentStatus: string;
    venueId: bigint | null;
    arrangedByAdminId: bigint;
    maleRating: number | null;
    femaleRating: number | null;
    notes: string | null;
  }[] = [];

  for (let i = 0; i < 100; i++) {
    const maleUser = randomItem(maleUsers);
    const femaleUser = randomItem(femaleUsers);
    const venue = venues.length > 0 ? randomItem(venues) : null;
    const status = randomItem(statuses);

    // 2026年2月1日〜2月28日のランダムな日付
    const day = randomInt(1, 28);
    const hour = randomInt(11, 20); // 11時〜20時
    const minute = randomInt(0, 1) * 30; // 0分か30分

    const startAt = new Date(2026, 1, day, hour, minute, 0); // 月は0始まりなので1が2月
    const endAt = new Date(startAt.getTime() + 90 * 60 * 1000); // 90分後

    // 完了したマッチングにはレーティングを付ける
    let maleRating: number | null = null;
    let femaleRating: number | null = null;
    let notes: string | null = null;

    if (status === 'completed') {
      maleRating = randomInt(1, 5);
      femaleRating = randomInt(1, 5);

      const noteOptions = [
        '良い雰囲気で終了。双方から好印象。',
        '会話が弾んでいた。次回のデートを希望。',
        '少し緊張気味だったが、後半は打ち解けた様子。',
        '共通の趣味で盛り上がっていた。',
        '時間通りに終了。お互いに礼儀正しい対応。',
        null,
      ];
      notes = randomItem(noteOptions);
    } else if (status === 'cancelled') {
      const cancelNotes = [
        '男性側都合によりキャンセル',
        '女性側都合によりキャンセル',
        '双方の都合が合わずキャンセル',
        '体調不良のためキャンセル',
      ];
      notes = randomItem(cancelNotes);
    } else if (status === 'confirmed') {
      notes = '会場予約済み。当日の連絡先を双方に送信済み。';
    }

    matchings.push({
      maleUserId: maleUser.id,
      femaleUserId: femaleUser.id,
      startAt,
      endAt,
      currentStatus: status,
      venueId: venue?.id || null,
      arrangedByAdminId: admin.id,
      maleRating,
      femaleRating,
      notes,
    });
  }

  // バルクインサート
  await prisma.matching.createMany({
    data: matchings,
  });

  console.log(`Created ${matchings.length} sample matchings for February 2026`);
}

async function seedUserAttributes() {
  // 既存属性数を確認
  const existingCount = await prisma.userAttribute.count();
  if (existingCount > 0) {
    console.log(`User attributes already exist (${existingCount} records), skipping...`);
    return;
  }

  console.log('Creating user attributes...');

  // ユーザーと属性タイプを取得
  const users = await prisma.user.findMany();
  const attributeTypes = await prisma.userAttributeType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  if (users.length === 0 || attributeTypes.length === 0) {
    console.log('No users or attribute types found, skipping...');
    return;
  }

  // ランダム選択用ヘルパー
  const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const randomItems = <T>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };
  const randomInt = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const attributes: {
    userId: bigint;
    attributeTypeId: bigint;
    value: string | string[] | { min: number; max: number };
  }[] = [];

  for (const user of users) {
    for (const attrType of attributeTypes) {
      // 性別対象チェック
      if (attrType.targetGender !== null && attrType.targetGender !== user.gender) {
        continue;
      }

      const options = attrType.options as { choices?: string[] } | null;
      let value: string | string[] | { min: number; max: number };

      switch (attrType.code) {
        case 'income':
          // 男性は全員、女性は20%の確率で設定
          if (user.gender === 1 || Math.random() < 0.2) {
            value = randomItem(options?.choices || []);
          } else {
            continue;
          }
          break;

        case 'education':
        case 'height':
        case 'smoking':
        case 'drinking':
        case 'marriage_history':
        case 'has_children':
        case 'body_type':
        case 'holiday':
        case 'want_children':
        case 'mbti':
          value = randomItem(options?.choices || []);
          break;

        case 'hobbies':
          // 2〜5個の趣味を選択
          value = randomItems(options?.choices || [], randomInt(2, 5));
          break;

        case 'personality':
          // 2〜4個の性格を選択
          value = randomItems(options?.choices || [], randomInt(2, 4));
          break;

        default:
          value = randomItem(options?.choices || []);
      }

      attributes.push({
        userId: user.id,
        attributeTypeId: attrType.id,
        value,
      });
    }
  }

  // バルクインサート
  await prisma.userAttribute.createMany({
    data: attributes,
  });

  console.log(`Created ${attributes.length} user attributes`);
}

async function seedUserPreferences() {
  // 既存希望条件数を確認
  const existingCount = await prisma.userPreference.count();
  if (existingCount > 0) {
    console.log(`User preferences already exist (${existingCount} records), skipping...`);
    return;
  }

  console.log('Creating user preferences...');

  // ユーザーと希望条件タイプを取得
  const users = await prisma.user.findMany();
  const preferenceTypes = await prisma.userPreferenceType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  if (users.length === 0 || preferenceTypes.length === 0) {
    console.log('No users or preference types found, skipping...');
    return;
  }

  // ランダム選択用ヘルパー
  const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const randomItems = <T>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };
  const randomInt = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const preferences: {
    userId: bigint;
    preferenceTypeId: bigint;
    value: string | string[] | { min: number; max: number };
  }[] = [];

  for (const user of users) {
    for (const prefType of preferenceTypes) {
      // 性別対象チェック
      if (prefType.targetGender !== null && prefType.targetGender !== user.gender) {
        continue;
      }

      const options = prefType.options as { choices?: string[]; min?: number; max?: number } | null;
      let value: string | string[] | { min: number; max: number };

      switch (prefType.code) {
        case 'desired_age': {
          // ユーザーの年齢を基準に希望年齢を設定
          const userAge = new Date().getFullYear() - (user.birthday?.getFullYear() || 1990);
          const minAge = Math.max(20, userAge - randomInt(5, 10));
          const maxAge = Math.min(60, userAge + randomInt(3, 8));
          value = { min: minAge, max: maxAge };
          break;
        }

        case 'desired_income': {
          // 女性のみ（targetGender=2）
          const incomeOptions = [
            '指定なし',
            '400万円以上',
            '600万円以上',
            '800万円以上',
            '1000万円以上',
          ];
          value = randomItem(incomeOptions);
          break;
        }

        case 'desired_occupation':
          // 2〜4個の職業を選択
          value = randomItems(options?.choices || [], randomInt(2, 4));
          break;

        case 'desired_education':
        case 'desired_smoking':
        case 'desired_drinking':
        case 'desired_marriage_history':
          value = randomItem(options?.choices || []);
          break;

        case 'desired_location':
          // 1〜3個の地域を選択
          value = randomItems(options?.choices || [], randomInt(1, 3));
          break;

        case 'desired_height': {
          // 性別に応じた身長希望
          if (user.gender === 1) {
            // 男性が女性に求める身長
            const minH = randomInt(150, 160);
            const maxH = randomInt(165, 175);
            value = { min: minH, max: maxH };
          } else {
            // 女性が男性に求める身長
            const minH = randomInt(165, 175);
            const maxH = randomInt(180, 190);
            value = { min: minH, max: maxH };
          }
          break;
        }

        case 'desired_other': {
          // 30%の確率でその他希望を記入
          if (Math.random() < 0.3) {
            const otherOptions = [
              '誠実で真剣に結婚を考えている方を希望します。',
              '価値観が合う方を探しています。',
              '一緒に笑い合える関係を築ける方が理想です。',
              '仕事と家庭を大切にできる方を希望しています。',
              '趣味を一緒に楽しめる方だと嬉しいです。',
            ];
            value = randomItem(otherOptions);
          } else {
            continue;
          }
          break;
        }

        default:
          value = randomItem(options?.choices || []);
      }

      preferences.push({
        userId: user.id,
        preferenceTypeId: prefType.id,
        value,
      });
    }
  }

  // バルクインサート
  await prisma.userPreference.createMany({
    data: preferences,
  });

  console.log(`Created ${preferences.length} user preferences`);
}

async function seedFeedbackCriteriaTypes() {
  console.log('Creating evaluation criteria types...');

  const criteriaTypes = [
    {
      code: 'appearance',
      name: '外見の印象',
      description: '相手の外見や身だしなみ、清潔感についての印象',
      fieldType: 'rating',
      options: { min: 1, max: 5, labels: { 1: '悪い', 3: '普通', 5: '良い' } },
      sortOrder: 1,
    },
    {
      code: 'conversation',
      name: '会話の盛り上がり',
      description: '会話のテンポや内容、コミュニケーションの質',
      fieldType: 'rating',
      options: {
        min: 1,
        max: 5,
        labels: { 1: '盛り上がらなかった', 3: '普通', 5: 'とても盛り上がった' },
      },
      sortOrder: 2,
    },
    {
      code: 'manner',
      name: 'マナー・気遣い',
      description: 'テーブルマナーや相手への気遣い、礼儀正しさ',
      fieldType: 'rating',
      options: { min: 1, max: 5, labels: { 1: '悪い', 3: '普通', 5: '良い' } },
      sortOrder: 3,
    },
    {
      code: 'meet_again',
      name: 'また会いたいか',
      description: '今後また会いたいと思うかどうか',
      fieldType: 'choice',
      options: { choices: ['はい', 'いいえ', 'どちらでもない'] },
      sortOrder: 4,
    },
  ];

  for (const ct of criteriaTypes) {
    await prisma.matchingEvaluationCriteriaType.upsert({
      where: { code: ct.code },
      update: {
        name: ct.name,
        description: ct.description,
        fieldType: ct.fieldType,
        options: ct.options,
        sortOrder: ct.sortOrder,
        isActive: true,
      },
      create: {
        code: ct.code,
        name: ct.name,
        description: ct.description,
        fieldType: ct.fieldType,
        options: ct.options,
        sortOrder: ct.sortOrder,
        isActive: true,
      },
    });
  }

  // 古いoverallを非アクティブ化
  await prisma.matchingEvaluationCriteriaType.updateMany({
    where: { code: 'overall' },
    data: { isActive: false },
  });

  console.log(`Created/Updated ${criteriaTypes.length} evaluation criteria types`);
}

async function seedUserAvailabilityPatterns() {
  // 既存パターン数を確認
  const existingCount = await prisma.userAvailabilityPattern.count();
  if (existingCount > 0) {
    console.log(`User availability patterns already exist (${existingCount} records), skipping...`);
    return;
  }

  console.log('Creating user availability patterns...');

  // ユーザーを取得
  const users = await prisma.user.findMany();

  if (users.length === 0) {
    console.log('No users found, skipping...');
    return;
  }

  // ランダム選択用ヘルパー
  const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const randomInt = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  // 曜日タイプ
  const dayTypes = [
    'weekday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
    'holiday',
  ];

  // 時間帯パターン
  const timeSlots = [
    { start: '11:00', end: '14:00', note: 'ランチタイム' },
    { start: '12:00', end: '15:00', note: 'お昼〜午後' },
    { start: '14:00', end: '17:00', note: '午後' },
    { start: '17:00', end: '20:00', note: '夕方〜夜' },
    { start: '18:00', end: '21:00', note: 'ディナータイム' },
    { start: '19:00', end: '22:00', note: '夜' },
    { start: '11:00', end: '20:00', note: '終日' },
  ];

  const patterns: {
    userId: bigint;
    dayType: string;
    startTime: string;
    endTime: string;
    notes: string | null;
    isActive: boolean;
  }[] = [];

  for (const user of users) {
    // 各ユーザーに2〜5個のパターンを作成
    const patternCount = randomInt(2, 5);
    const usedDayTypes = new Set<string>();

    for (let i = 0; i < patternCount; i++) {
      // 重複しない曜日タイプを選択
      let dayType: string;
      do {
        dayType = randomItem(dayTypes);
      } while (usedDayTypes.has(dayType) && usedDayTypes.size < dayTypes.length);

      if (usedDayTypes.has(dayType)) continue;
      usedDayTypes.add(dayType);

      const timeSlot = randomItem(timeSlots);

      // メモを追加（50%の確率）
      let notes: string | null = null;
      if (Math.random() < 0.5) {
        const noteOptions = [
          timeSlot.note + 'が都合良いです',
          '仕事の都合で' + timeSlot.note + 'のみ',
          '基本的にこの時間帯で調整可能',
          '前日までに連絡いただければ調整します',
          null,
        ];
        notes = randomItem(noteOptions);
      }

      patterns.push({
        userId: user.id,
        dayType,
        startTime: timeSlot.start,
        endTime: timeSlot.end,
        notes,
        isActive: true,
      });
    }
  }

  // バルクインサート
  await prisma.userAvailabilityPattern.createMany({
    data: patterns,
  });

  console.log(`Created ${patterns.length} user availability patterns`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
