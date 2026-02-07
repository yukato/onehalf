import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import OpenAI from 'openai';

async function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  return verifyAccessToken(token);
}

interface ExtractedValue {
  code: string;
  name: string;
  currentValue: unknown;
  suggestedValue: unknown;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

interface ExtractedBasicInfo {
  field: string;
  name: string;
  currentValue: unknown;
  suggestedValue: unknown;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

interface ExtractionResult {
  basicInfo: ExtractedBasicInfo[];
  attributes: ExtractedValue[];
  preferences: ExtractedValue[];
}

// POST /api/black/users/[id]/extract-profile - テキストからプロフィール情報を抽出
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ detail: 'Text is required' }, { status: 400 });
    }

    // ユーザー存在確認と詳細情報取得
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
      include: {
        occupation: true,
        prefecture: true,
      },
    });

    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    const userGender = user.gender;

    // 職業リストを取得
    const occupations = await prisma.occupation.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    // 都道府県リストを取得
    const prefectures = await prisma.prefecture.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    // 属性タイプを取得（性別でフィルタ）
    const attributeTypes = await prisma.userAttributeType.findMany({
      where: {
        isActive: true,
        OR: [{ targetGender: null }, { targetGender: userGender }],
      },
      orderBy: { sortOrder: 'asc' },
    });

    // 希望条件タイプを取得（異性の属性に対応）
    const preferenceTypes = await prisma.userPreferenceType.findMany({
      where: {
        isActive: true,
        OR: [{ targetGender: null }, { targetGender: userGender }],
      },
      orderBy: { sortOrder: 'asc' },
    });

    // 現在の属性を取得
    const currentAttributes = await prisma.userAttribute.findMany({
      where: { userId: BigInt(id) },
      include: { attributeType: true },
    });

    // 現在の希望条件を取得
    const currentPreferences = await prisma.userPreference.findMany({
      where: { userId: BigInt(id) },
      include: { preferenceType: true },
    });

    // OpenAI APIで抽出
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `あなたはマッチングサービスのプロフィール情報を抽出するアシスタントです。
面談メモや会話記録から、ユーザーの基本情報、プロフィール属性、希望条件を抽出してください。

【重要な区別】
- 「自分は〜」「私は〜」「本人は〜」などの表現 → ユーザー自身の情報 (basicInfo または attributes)
- 「相手には〜」「希望は〜」「パートナーには〜」などの表現 → 希望条件 (preferences)

【basicInfoとattributesの区別】
- basicInfo: 生年月日、職業、居住地などの基本的なプロフィール情報
- attributes: それ以外のプロフィール属性（身長、年収など）

以下のルールに従ってください：
1. テキストに明確に記載されている情報のみを抽出する
2. 推測や補完は行わない
3. 自分自身についての情報はbasicInfoまたはattributesに、相手への希望はpreferencesに分類する
4. 信頼度は以下の基準で判定：
   - high: 明確に記載されている
   - medium: 文脈から読み取れる
   - low: 曖昧な表現から推測
5. 【重要】「そのまま」「変更しない」「維持する」「条件は変えない」などの表現で現状維持を希望している項目は、抽出結果に含めない（変更提案しない）

【範囲型(range)の解釈ルール】
- 「〜以上」「〜から」「〜程度を求める」→ min: 数値, max: null
- 「〜以下」「〜まで」→ min: null, max: 数値
- 「〜くらい」「〜程度」（範囲を示さない場合）→ min: 数値, max: null（その値以上として解釈）
- 「AからB」「A〜B」→ min: A, max: B

回答はJSON形式で、以下の構造で返してください：
{
  "basicInfo": [
    {
      "field": "フィールド名（birthday, occupationId, prefectureId, mobileNumber）",
      "suggestedValue": "提案値",
      "confidence": "high/medium/low",
      "reason": "抽出根拠の説明"
    }
  ],
  "attributes": [
    {
      "code": "属性コード",
      "suggestedValue": "提案値（フィールドタイプに応じた形式）",
      "confidence": "high/medium/low",
      "reason": "抽出根拠の説明"
    }
  ],
  "preferences": [
    {
      "code": "希望条件コード",
      "suggestedValue": "提案値（フィールドタイプに応じた形式）",
      "confidence": "high/medium/low",
      "reason": "抽出根拠の説明"
    }
  ]
}

フィールドタイプ別の値の形式：
- select: 文字列（選択肢のvalue）
- multiSelect: 文字列の配列（選択肢のvalueの配列）
- text: 文字列
- range: { "min": 数値または null, "max": 数値または null }
- date: YYYY-MM-DD形式の文字列
- id: 数値（職業・都道府県のID）`;

    const attributeSchema = attributeTypes.map((at) => ({
      code: at.code,
      name: at.name,
      fieldType: at.fieldType,
      options: at.options,
    }));

    const preferenceSchema = preferenceTypes.map((pt) => ({
      code: pt.code,
      name: pt.name,
      fieldType: pt.fieldType,
      options: pt.options,
    }));

    // 基本情報フィールドの定義
    const basicInfoFields = [
      {
        field: 'birthday',
        name: '生年月日',
        type: 'date',
        currentValue: user.birthday ? user.birthday.toISOString().split('T')[0] : null,
      },
      {
        field: 'occupationId',
        name: '職業',
        type: 'select',
        currentValue: user.occupationId,
        options: occupations.map((o) => ({ id: o.id, name: o.name })),
      },
      {
        field: 'prefectureId',
        name: '居住地',
        type: 'select',
        currentValue: user.prefectureId,
        options: prefectures.map((p) => ({ id: p.id, name: p.name })),
      },
      { field: 'mobileNumber', name: '電話番号', type: 'text', currentValue: user.mobileNumber },
    ];

    const userPrompt = `以下の面談メモから、プロフィール情報を抽出してください。

【ユーザー情報】
性別: ${userGender === 1 ? '男性' : '女性'}

【基本情報フィールド（ユーザーの基本プロフィール）】
※生年月日、職業、居住地などはこちらに分類
${JSON.stringify(basicInfoFields, null, 2)}

【利用可能な属性タイプ（ユーザー自身のプロフィール）】
※「自分は〜」「私は〜」などの表現はこちらに分類
${JSON.stringify(attributeSchema, null, 2)}

【利用可能な希望条件タイプ（相手への希望）】
※「相手には〜」「希望は〜」などの表現はこちらに分類
${JSON.stringify(preferenceSchema, null, 2)}

【面談メモ】
${text}

上記のメモから抽出できる情報をJSON形式で返してください。
- テキストに記載がない項目は含めないでください
- 生年月日、職業、居住地、電話番号はbasicInfoに分類してください
- 職業・居住地はoptionsからIDを選択してください
- 「自分は〜」で上記以外の項目はattributes、「相手には〜」はpreferencesに分類してください
- 範囲型で「〜以上」「〜程度を求める」の場合はmax: nullとしてください`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      return NextResponse.json({ detail: 'Failed to extract profile' }, { status: 500 });
    }

    const extracted = JSON.parse(responseText) as {
      basicInfo?: Array<{
        field: string;
        suggestedValue: unknown;
        confidence: 'high' | 'medium' | 'low';
        reason: string;
      }>;
      attributes: Array<{
        code: string;
        suggestedValue: unknown;
        confidence: 'high' | 'medium' | 'low';
        reason: string;
      }>;
      preferences: Array<{
        code: string;
        suggestedValue: unknown;
        confidence: 'high' | 'medium' | 'low';
        reason: string;
      }>;
    };

    // 基本情報フィールドの表示名マップ
    const basicInfoFieldNames: Record<string, string> = {
      birthday: '生年月日',
      occupationId: '職業',
      prefectureId: '居住地',
      mobileNumber: '電話番号',
    };

    // 基本情報の現在値を取得する関数
    const getBasicInfoCurrentValue = (field: string): unknown => {
      switch (field) {
        case 'birthday':
          return user.birthday ? user.birthday.toISOString().split('T')[0] : null;
        case 'occupationId':
          return user.occupationId;
        case 'prefectureId':
          return user.prefectureId;
        case 'mobileNumber':
          return user.mobileNumber;
        default:
          return null;
      }
    };

    // 値が同じかどうかを比較する関数
    const isValueEqual = (a: unknown, b: unknown): boolean => {
      if (a === b) return true;
      if (a === null && b === null) return true;
      if (a === null || b === null) return false;
      if (typeof a !== typeof b) return false;
      if (typeof a === 'object' && typeof b === 'object') {
        return JSON.stringify(a) === JSON.stringify(b);
      }
      return false;
    };

    // 結果を整形（現在値と名前を追加、変更がないものは除外）
    const result: ExtractionResult = {
      basicInfo: (extracted.basicInfo || [])
        .map((info) => ({
          field: info.field,
          name: basicInfoFieldNames[info.field] || info.field,
          currentValue: getBasicInfoCurrentValue(info.field),
          suggestedValue: info.suggestedValue,
          confidence: info.confidence,
          reason: info.reason,
        }))
        .filter((info) => !isValueEqual(info.currentValue, info.suggestedValue)),
      attributes: (extracted.attributes || [])
        .map((attr) => {
          const attrType = attributeTypes.find((at) => at.code === attr.code);
          const currentAttr = currentAttributes.find((ca) => ca.attributeType.code === attr.code);
          if (!attrType) {
            console.warn(
              `Unknown attribute code from AI: ${attr.code}. Available codes: ${attributeTypes.map((t) => t.code).join(', ')}`
            );
          }
          return {
            code: attr.code,
            name: attrType?.name || attr.code,
            currentValue: currentAttr?.value ?? null,
            suggestedValue: attr.suggestedValue,
            confidence: attr.confidence,
            reason: attr.reason,
          };
        })
        .filter((attr) => !isValueEqual(attr.currentValue, attr.suggestedValue)),
      preferences: (extracted.preferences || [])
        .map((pref) => {
          const prefType = preferenceTypes.find((pt) => pt.code === pref.code);
          const currentPref = currentPreferences.find((cp) => cp.preferenceType.code === pref.code);
          if (!prefType) {
            console.warn(
              `Unknown preference code from AI: ${pref.code}. Available codes: ${preferenceTypes.map((t) => t.code).join(', ')}`
            );
          }
          return {
            code: pref.code,
            name: prefType?.name || pref.code,
            currentValue: currentPref?.value ?? null,
            suggestedValue: pref.suggestedValue,
            confidence: pref.confidence,
            reason: pref.reason,
          };
        })
        .filter((pref) => !isValueEqual(pref.currentValue, pref.suggestedValue)),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Extract profile error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
