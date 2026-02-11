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

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
