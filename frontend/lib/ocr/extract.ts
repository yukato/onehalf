import Anthropic from '@anthropic-ai/sdk';
import { getLlmSettingsRaw } from '@/lib/llm-settings/queries';
import { getStorage } from '@/lib/storage';
import { updateOcrExtraction } from './queries';
import type { OcrExtractedData, OcrExtractedItem } from '@/types';
import type { RowDataPacket } from 'mysql2';
import { getCompanyPool, ensureCompanyDatabase } from '@/lib/company-db';

// ---------- Matching helpers ----------

interface CustomerRow extends RowDataPacket {
  id: bigint;
  code: string;
  name: string;
  name_kana: string | null;
}

interface ProductRow extends RowDataPacket {
  id: bigint;
  code: string;
  name: string;
  name_kana: string | null;
  unit: string;
  unit_price: number;
}

function normalizeStr(s: string): string {
  return s.toLowerCase().replace(/[\s\u3000]/g, '').replace(/[ー−‐]/g, '-');
}

function stringSimilarity(a: string, b: string): number {
  const na = normalizeStr(a);
  const nb = normalizeStr(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  if (na.startsWith(nb.slice(0, 3)) || nb.startsWith(na.slice(0, 3))) return 0.5;
  return 0;
}

async function matchCustomer(
  companySlug: string,
  customerName?: string,
  customerCode?: string
): Promise<{ customerId: string; customerName: string; confidence: number } | null> {
  if (!customerName && !customerCode) return null;

  await ensureCompanyDatabase(companySlug);
  const p = getCompanyPool(companySlug);

  const [rows] = await p.execute<CustomerRow[]>(
    "SELECT id, code, name, name_kana FROM customers WHERE is_active = TRUE"
  );

  if (rows.length === 0) return null;

  // Try code match first
  if (customerCode) {
    const codeMatch = rows.find(r => r.code === customerCode);
    if (codeMatch) {
      return {
        customerId: codeMatch.id.toString(),
        customerName: codeMatch.name,
        confidence: 1.0,
      };
    }
  }

  // Fuzzy name match
  if (customerName) {
    let bestMatch: CustomerRow | null = null;
    let bestScore = 0;

    for (const row of rows) {
      const nameScore = stringSimilarity(customerName, row.name);
      const kanaScore = row.name_kana ? stringSimilarity(customerName, row.name_kana) : 0;
      const score = Math.max(nameScore, kanaScore);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = row;
      }
    }

    if (bestMatch && bestScore >= 0.5) {
      return {
        customerId: bestMatch.id.toString(),
        customerName: bestMatch.name,
        confidence: bestScore,
      };
    }
  }

  return null;
}

async function matchProducts(
  companySlug: string,
  items: OcrExtractedItem[]
): Promise<OcrExtractedItem[]> {
  await ensureCompanyDatabase(companySlug);
  const p = getCompanyPool(companySlug);

  const [products] = await p.execute<ProductRow[]>(
    "SELECT id, code, name, name_kana, unit, unit_price FROM products WHERE is_active = TRUE"
  );

  if (products.length === 0) return items;

  return items.map(item => {
    // Try code match first
    if (item.productCode) {
      const codeMatch = products.find(p => p.code === item.productCode);
      if (codeMatch) {
        return {
          ...item,
          matchedProductId: codeMatch.id.toString(),
          matchedProductName: codeMatch.name,
          matchConfidence: 1.0,
          unit: item.unit || codeMatch.unit,
          unitPrice: item.unitPrice ?? Number(codeMatch.unit_price),
        };
      }
    }

    // Fuzzy name match
    let bestMatch: ProductRow | null = null;
    let bestScore = 0;

    for (const prod of products) {
      const nameScore = stringSimilarity(item.productName, prod.name);
      const kanaScore = prod.name_kana ? stringSimilarity(item.productName, prod.name_kana) : 0;
      const score = Math.max(nameScore, kanaScore);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = prod;
      }
    }

    if (bestMatch && bestScore >= 0.5) {
      return {
        ...item,
        matchedProductId: bestMatch.id.toString(),
        matchedProductName: bestMatch.name,
        matchConfidence: bestScore,
        unit: item.unit || bestMatch.unit,
        unitPrice: item.unitPrice ?? Number(bestMatch.unit_price),
      };
    }

    return item;
  });
}

// ---------- OCR Extraction ----------

const EXTRACTION_PROMPT = `あなたは注文書の画像からデータを構造化して抽出するAIです。
以下の画像を解析し、注文書の内容をJSON形式で抽出してください。

出力するJSONのフォーマット:
{
  "customerName": "取引先名（注文元の会社名）",
  "customerCode": "取引先コード（記載がある場合）",
  "orderDate": "注文日 (YYYY-MM-DD形式)",
  "items": [
    {
      "productName": "商品名",
      "productCode": "商品コード（記載がある場合）",
      "quantity": 数量（数値）,
      "unit": "単位",
      "unitPrice": 単価（数値、記載がある場合）
    }
  ],
  "notes": "備考・特記事項",
  "rawText": "画像から読み取れた全テキスト"
}

重要な注意:
- JSONのみを出力してください（マークダウンのコードブロックは不要）
- 数量は必ず数値で出力してください
- 読み取れない項目はnullにしてください
- 日付はYYYY-MM-DD形式に変換してください
- 商品が複数ある場合はitemsを配列にしてください`;

export async function performOcrExtraction(
  companySlug: string,
  ocrId: string,
  imagePath: string
): Promise<void> {
  try {
    // Update status to extracting
    await updateOcrExtraction(companySlug, ocrId, { status: 'extracting' });

    // Get LLM settings
    const llmSettings = await getLlmSettingsRaw(companySlug);
    const apiKey = llmSettings.apiKeyAnthropic;

    if (!apiKey) {
      await updateOcrExtraction(companySlug, ocrId, {
        status: 'error',
        errorMessage: 'Anthropic APIキーが設定されていません。設定画面からAPIキーを登録してください。',
      });
      return;
    }

    // Download image
    const storage = getStorage();
    const imageBuffer = await storage.download(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Determine media type
    const ext = imagePath.split('.').pop()?.toLowerCase() || '';
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
    if (ext === 'png') mediaType = 'image/png';
    else if (ext === 'gif') mediaType = 'image/gif';
    else if (ext === 'webp') mediaType = 'image/webp';

    // Call Claude Vision API
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: llmSettings.model || 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      await updateOcrExtraction(companySlug, ocrId, {
        status: 'error',
        errorMessage: 'AIからの応答にテキストが含まれませんでした。',
      });
      return;
    }

    // Parse extracted data
    let extractedData: OcrExtractedData;
    try {
      const jsonStr = textContent.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(jsonStr);
    } catch {
      await updateOcrExtraction(companySlug, ocrId, {
        status: 'error',
        errorMessage: 'AIの応答をJSON解析できませんでした。',
      });
      return;
    }

    // Match customer
    const customerMatch = await matchCustomer(
      companySlug,
      extractedData.customerName,
      extractedData.customerCode
    );

    // Match products
    if (extractedData.items && extractedData.items.length > 0) {
      extractedData.items = await matchProducts(companySlug, extractedData.items);
    }

    // Update extraction record
    await updateOcrExtraction(companySlug, ocrId, {
      extractedData,
      matchedCustomerId: customerMatch?.customerId ?? null,
      matchedCustomerName: customerMatch?.customerName ?? null,
      matchConfidence: customerMatch?.confidence ?? null,
      status: 'extracted',
    });
  } catch (error) {
    console.error(`OCR extraction failed [company=${companySlug}, ocr=${ocrId}]:`, error);
    await updateOcrExtraction(companySlug, ocrId, {
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'OCR処理中に予期しないエラーが発生しました。',
    });
  }
}
