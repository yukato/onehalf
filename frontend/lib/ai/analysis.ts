import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import crypto from 'crypto';
import type { RowDataPacket } from 'mysql2';
import { getCompanyPool, ensureCompanyDatabase } from '@/lib/company-db';
import { getLlmSettingsRaw } from '@/lib/llm-settings/queries';

// ---------- Helper ----------

async function pool(companySlug: string) {
  await ensureCompanyDatabase(companySlug);
  return getCompanyPool(companySlug);
}

// ---------- Row types ----------

interface MonthlySalesRow extends RowDataPacket {
  month: string;
  sales: string;
  order_count: number;
}

interface TopCustomerRow extends RowDataPacket {
  customer_name: string;
  customer_code: string;
  total_sales: string;
  order_count: number;
}

interface TopProductRow extends RowDataPacket {
  product_name: string;
  product_code: string;
  total_amount: string;
  total_quantity: string;
  order_count: number;
}

interface CacheRow extends RowDataPacket {
  id: bigint;
  result_markdown: string;
  data_hash: string;
  generated_at: Date;
  expires_at: Date;
}

// ---------- Sales Data Aggregation ----------

export async function getSalesDataForAnalysis(companySlug: string) {
  const p = await pool(companySlug);

  // Monthly sales totals (last 12 months)
  const [monthlyRows] = await p.execute<MonthlySalesRow[]>(
    `SELECT
       DATE_FORMAT(order_date, '%Y-%m') AS month,
       COALESCE(SUM(total_amount), 0) AS sales,
       COUNT(*) AS order_count
     FROM orders
     WHERE status NOT IN ('cancelled')
       AND order_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
     GROUP BY DATE_FORMAT(order_date, '%Y-%m')
     ORDER BY month ASC`
  );

  // Top customers by revenue
  const [customerRows] = await p.execute<TopCustomerRow[]>(
    `SELECT
       c.name AS customer_name, c.code AS customer_code,
       SUM(o.total_amount) AS total_sales,
       COUNT(*) AS order_count
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     WHERE o.status NOT IN ('cancelled')
       AND o.order_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
     GROUP BY c.name, c.code
     ORDER BY total_sales DESC
     LIMIT 10`
  );

  // Top products by quantity
  const [productRows] = await p.execute<TopProductRow[]>(
    `SELECT
       oi.product_name, oi.product_code,
       SUM(oi.amount) AS total_amount,
       SUM(oi.quantity) AS total_quantity,
       COUNT(DISTINCT oi.order_id) AS order_count
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.status NOT IN ('cancelled')
       AND o.order_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
     GROUP BY oi.product_name, oi.product_code
     ORDER BY total_amount DESC
     LIMIT 10`
  );

  const monthly = monthlyRows.map(r => ({
    month: r.month,
    sales: parseFloat(r.sales),
    orderCount: r.order_count,
  }));

  // Calculate month-over-month growth
  const growth = monthly.map((m, i) => {
    if (i === 0) return { ...m, growthRate: null as number | null };
    const prev = monthly[i - 1].sales;
    const rate = prev > 0 ? ((m.sales - prev) / prev) * 100 : null;
    return { ...m, growthRate: rate };
  });

  const customers = customerRows.map(r => ({
    name: r.customer_name || '不明',
    code: r.customer_code || '',
    totalSales: parseFloat(r.total_sales),
    orderCount: r.order_count,
  }));

  const products = productRows.map(r => ({
    name: r.product_name,
    code: r.product_code || '',
    totalAmount: parseFloat(r.total_amount),
    totalQuantity: parseFloat(r.total_quantity),
    orderCount: r.order_count,
  }));

  // Date range
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  return {
    monthly: growth,
    customers,
    products,
    dataRange: {
      from: twelveMonthsAgo.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    },
  };
}

// ---------- Cache ----------

function hashData(data: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

async function getCachedAnalysis(companySlug: string, analysisType: string): Promise<CacheRow | null> {
  const p = await pool(companySlug);
  const [rows] = await p.execute<CacheRow[]>(
    `SELECT * FROM ai_analysis_cache
     WHERE analysis_type = ? AND expires_at > NOW()
     ORDER BY generated_at DESC LIMIT 1`,
    [analysisType]
  );
  return rows.length > 0 ? rows[0] : null;
}

async function setCachedAnalysis(
  companySlug: string,
  analysisType: string,
  markdown: string,
  dataHash: string
) {
  const p = await pool(companySlug);
  await p.execute(
    `INSERT INTO ai_analysis_cache (analysis_type, result_markdown, data_hash, generated_at, expires_at)
     VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
    [analysisType, markdown, dataHash]
  );
}

// ---------- AI Analysis ----------

function buildAnalysisPrompt(salesData: Awaited<ReturnType<typeof getSalesDataForAnalysis>>): string {
  const lines: string[] = [];

  lines.push('## 月次売上推移（直近12ヶ月）');
  for (const m of salesData.monthly) {
    const growth = m.growthRate !== null ? ` (前月比: ${m.growthRate > 0 ? '+' : ''}${m.growthRate.toFixed(1)}%)` : '';
    lines.push(`- ${m.month}: ¥${m.sales.toLocaleString()} (${m.orderCount}件)${growth}`);
  }

  lines.push('');
  lines.push('## 顧客別売上TOP10');
  for (const c of salesData.customers) {
    lines.push(`- ${c.name} (${c.code}): ¥${c.totalSales.toLocaleString()} (${c.orderCount}件)`);
  }

  lines.push('');
  lines.push('## 商品別売上TOP10');
  for (const p of salesData.products) {
    lines.push(`- ${p.name} (${p.code}): ¥${p.totalAmount.toLocaleString()} / ${p.totalQuantity}個 (${p.orderCount}件)`);
  }

  return lines.join('\n');
}

const SYSTEM_PROMPT = `あなたはビジネスアナリストです。以下の売上データを分析し、日本語マークダウン形式でインサイトを提供してください。

以下の項目を含めてください：
1. **全体トレンド**: 売上の推移と傾向
2. **季節性パターン**: 季節的な変動があれば指摘
3. **主要顧客インサイト**: 上位顧客の特徴と依存度
4. **商品パフォーマンス**: 売れ筋商品と改善余地
5. **アクションの提案**: 具体的な改善・成長施策

簡潔で実用的な分析を心がけてください。データが少ない場合は、その旨を伝えた上で可能な範囲で分析してください。`;

export async function generateAiAnalysis(
  companySlug: string,
  refresh = false
): Promise<{ analysis: string; generatedAt: string; dataRange: { from: string; to: string } }> {
  // 1. Get sales data
  const salesData = await getSalesDataForAnalysis(companySlug);
  const dataHash = hashData(salesData);

  // 2. Check cache (unless refresh is requested)
  if (!refresh) {
    const cached = await getCachedAnalysis(companySlug, 'sales_analysis');
    if (cached && cached.data_hash === dataHash) {
      return {
        analysis: cached.result_markdown,
        generatedAt: cached.generated_at.toISOString(),
        dataRange: salesData.dataRange,
      };
    }
  }

  // 3. Check if there's any data to analyze
  if (salesData.monthly.length === 0 && salesData.customers.length === 0 && salesData.products.length === 0) {
    const noDataMsg = '分析可能な売上データがありません。受注データが登録されると、AI分析が利用可能になります。';
    return {
      analysis: noDataMsg,
      generatedAt: new Date().toISOString(),
      dataRange: salesData.dataRange,
    };
  }

  // 4. Get LLM settings
  const llmSettings = await getLlmSettingsRaw(companySlug);
  const apiKey = llmSettings.provider === 'anthropic'
    ? llmSettings.apiKeyAnthropic
    : llmSettings.apiKeyOpenai;

  if (!apiKey) {
    return {
      analysis: 'API keyが設定されていません。設定ページでAPI keyを設定してください。',
      generatedAt: new Date().toISOString(),
      dataRange: salesData.dataRange,
    };
  }

  // 5. Call LLM
  const userMessage = buildAnalysisPrompt(salesData);
  let analysisMarkdown: string;

  if (llmSettings.provider === 'anthropic') {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: llmSettings.model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
    analysisMarkdown = response.content[0].type === 'text' ? response.content[0].text : '';
  } else {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: llmSettings.model,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });
    analysisMarkdown = response.choices[0]?.message?.content || '';
  }

  // 6. Cache the result
  const generatedAt = new Date().toISOString();
  await setCachedAnalysis(companySlug, 'sales_analysis', analysisMarkdown, dataHash);

  return {
    analysis: analysisMarkdown,
    generatedAt,
    dataRange: salesData.dataRange,
  };
}
