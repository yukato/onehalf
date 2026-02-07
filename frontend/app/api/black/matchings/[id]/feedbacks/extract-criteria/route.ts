import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { MatchingEvaluationCriteriaType } from '@/lib/generated/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExtractedCriteria {
  criteriaTypeId: string;
  criteriaTypeCode: string;
  criteriaTypeName: string;
  value: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

// POST: フィードバック内容から評価観点をAIで抽出
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchingId } = await params;
    const { content, userId } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // マッチング情報を取得
    const matching = await prisma.matching.findUnique({
      where: { id: BigInt(matchingId) },
      include: {
        maleUser: { select: { id: true, lastName: true, firstName: true } },
        femaleUser: { select: { id: true, lastName: true, firstName: true } },
      },
    });

    if (!matching) {
      return NextResponse.json({ error: 'Matching not found' }, { status: 404 });
    }

    // 対象ユーザーを特定（指定されていない場合はコンテキストから推測）
    let targetUser: { lastName: string; firstName: string } | null = null;
    let targetLabel = '';

    if (userId) {
      const isMale = matching.maleUserId === BigInt(userId);
      targetUser = isMale ? matching.maleUser : matching.femaleUser;
      targetLabel = isMale ? '男性' : '女性';
    }

    // 既存の評価観点を取得（更新提案のため）
    let existingCriteria: { criteriaTypeId: bigint; value: string }[] = [];
    if (userId) {
      existingCriteria = await prisma.matchingEvaluationCriteria.findMany({
        where: {
          matchingId: BigInt(matchingId),
          userId: BigInt(userId),
        },
        select: {
          criteriaTypeId: true,
          value: true,
        },
      });
    }

    // 評価観点マスタを取得
    const criteriaTypes = await prisma.matchingEvaluationCriteriaType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // AI用のプロンプトを作成
    const criteriaDescriptions = criteriaTypes
      .map((ct: MatchingEvaluationCriteriaType) => {
        let valueDescription = '';
        const options = ct.options as {
          min?: number;
          max?: number;
          labels?: Record<string, string>;
          choices?: string[];
        } | null;

        if (ct.fieldType === 'rating') {
          valueDescription = `1〜5の数値で評価（1: ${options?.labels?.['1'] || '悪い'}, 3: ${options?.labels?.['3'] || '普通'}, 5: ${options?.labels?.['5'] || '良い'}）`;
        } else if (ct.fieldType === 'choice' && options?.choices) {
          valueDescription = `選択肢: ${options.choices.join('、')}`;
        }

        // 既存の値があれば追記
        const existing = existingCriteria.find((e) => e.criteriaTypeId === ct.id);
        const existingNote = existing ? ` [現在の値: ${existing.value}]` : '';

        return `- ${ct.code} (${ct.name}): ${ct.description || ''}。${valueDescription}${existingNote}`;
      })
      .join('\n');

    const existingNote =
      existingCriteria.length > 0
        ? '\n\n注意: 既存の評価値がある場合は、新しいフィードバック内容に基づいて更新が必要かどうかを判断してください。'
        : '';

    const systemPrompt = `あなたはマッチングサービスのフィードバック分析アシスタントです。
ユーザーからのフィードバック内容を分析し、以下の評価観点について値を抽出してください。

評価観点:
${criteriaDescriptions}

注意事項:
- フィードバック内容から読み取れる情報のみを抽出してください
- 明確に読み取れない場合は、confidenceを'low'にしてください
- ratingの場合は1〜5の数値を文字列で返してください
- choiceの場合は選択肢から最も適切なものを選んでください
- 各観点について、なぜその値を抽出したのか簡潔な理由を付けてください${existingNote}`;

    let targetInfo = '';
    if (targetUser) {
      targetInfo = `\n対象: ${targetLabel}（${targetUser.lastName} ${targetUser.firstName}さん）`;
    }

    const userPrompt = `以下のマッチングフィードバック内容から、評価観点の値を抽出してください。

マッチング情報:
- 男性: ${matching.maleUser.lastName} ${matching.maleUser.firstName}さん
- 女性: ${matching.femaleUser.lastName} ${matching.femaleUser.firstName}さん${targetInfo}

フィードバック内容:
${content}

以下のJSON形式で回答してください:
{
  "criteria": [
    {
      "criteriaTypeCode": "観点のコード",
      "value": "抽出した値",
      "confidence": "high" | "medium" | "low",
      "reason": "抽出理由"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const aiResponse = response.choices[0]?.message?.content;
    if (!aiResponse) {
      return NextResponse.json({ error: 'AI response is empty' }, { status: 500 });
    }

    const parsed = JSON.parse(aiResponse);

    // criteriaTypeIdを付与
    const extractedCriteria: ExtractedCriteria[] = (parsed.criteria || [])
      .map(
        (c: {
          criteriaTypeCode: string;
          value: string;
          confidence: 'high' | 'medium' | 'low';
          reason: string;
        }) => {
          const criteriaType = criteriaTypes.find(
            (ct: MatchingEvaluationCriteriaType) => ct.code === c.criteriaTypeCode
          );
          return {
            criteriaTypeId: criteriaType?.id.toString() || '',
            criteriaTypeCode: c.criteriaTypeCode,
            criteriaTypeName: criteriaType?.name || c.criteriaTypeCode,
            value: c.value,
            confidence: c.confidence,
            reason: c.reason,
          };
        }
      )
      .filter((c: ExtractedCriteria) => c.criteriaTypeId); // criteriaTypeIdがあるもののみ

    return NextResponse.json({ criteria: extractedCriteria });
  } catch (error) {
    console.error('Error extracting feedback criteria:', error);
    return NextResponse.json({ error: 'Failed to extract feedback criteria' }, { status: 500 });
  }
}
