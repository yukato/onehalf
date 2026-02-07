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

interface ExtractedMatching {
  maleUser: {
    searchQuery: string;
    suggestedId: string | null;
    suggestedName: string | null;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  };
  femaleUser: {
    searchQuery: string;
    suggestedId: string | null;
    suggestedName: string | null;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  };
  dateTime: {
    suggestedStartAt: string | null;
    suggestedEndAt: string | null;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  };
  venue: {
    suggestedName: string | null;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  };
  notes: {
    suggestedValue: string | null;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  };
}

// POST /api/black/matchings/extract - テキストからマッチング情報を抽出
export async function POST(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ detail: 'Text is required' }, { status: 400 });
    }

    // OpenAI APIで抽出
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `あなたはマッチングサービスのデート調整情報を抽出するアシスタントです。
チーム内でのやり取りや面談メモから、マッチング情報を抽出してください。

以下のルールに従ってください：
1. テキストに明確に記載されている情報のみを抽出する
2. 推測や補完は行わない
3. 日時は ISO 8601 形式（YYYY-MM-DDTHH:mm）で返す
4. 年が書かれていない場合は現在の年を使用する
5. 終了時刻が明示されていない場合は、開始時刻の2時間後を提案する
6. 信頼度は以下の基準で判定：
   - high: 明確に記載されている
   - medium: 文脈から読み取れる
   - low: 曖昧な表現から推測

回答はJSON形式で、以下の構造で返してください：
{
  "maleUser": {
    "searchQuery": "男性会員の名前やID（検索用）",
    "confidence": "high/medium/low",
    "reason": "抽出根拠"
  },
  "femaleUser": {
    "searchQuery": "女性会員の名前やID（検索用）",
    "confidence": "high/medium/low",
    "reason": "抽出根拠"
  },
  "dateTime": {
    "suggestedStartAt": "YYYY-MM-DDTHH:mm 形式または null",
    "suggestedEndAt": "YYYY-MM-DDTHH:mm 形式または null",
    "confidence": "high/medium/low",
    "reason": "抽出根拠"
  },
  "venue": {
    "suggestedName": "待合せ場所の名前または null",
    "confidence": "high/medium/low",
    "reason": "抽出根拠"
  },
  "notes": {
    "suggestedValue": "その他の重要な情報（服装、集合場所の詳細など）または null",
    "confidence": "high/medium/low",
    "reason": "抽出根拠"
  }
}

注意：
- 「〇〇さん」「〇〇様」などの敬称は除いて名前を抽出する
- 「男性」「女性」という表現があれば、性別の判別に使う
- 日付と時刻が別々に書かれている場合は組み合わせる
- 「明日」「来週」などの相対的な表現は、今日の日付（${new Date().toISOString().split('T')[0]}）を基準に計算する`;

    const userPrompt = `以下のテキストから、マッチング（デート）の情報を抽出してください。

【テキスト】
${text}

上記のテキストから抽出できる情報をJSON形式で返してください。
情報がない項目は null を設定してください。`;

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
      return NextResponse.json({ detail: 'Failed to extract matching info' }, { status: 500 });
    }

    const extracted = JSON.parse(responseText) as {
      maleUser: {
        searchQuery: string;
        confidence: 'high' | 'medium' | 'low';
        reason: string;
      };
      femaleUser: {
        searchQuery: string;
        confidence: 'high' | 'medium' | 'low';
        reason: string;
      };
      dateTime: {
        suggestedStartAt: string | null;
        suggestedEndAt: string | null;
        confidence: 'high' | 'medium' | 'low';
        reason: string;
      };
      venue: {
        suggestedName: string | null;
        confidence: 'high' | 'medium' | 'low';
        reason: string;
      };
      notes: {
        suggestedValue: string | null;
        confidence: 'high' | 'medium' | 'low';
        reason: string;
      };
    };

    // ユーザーを検索してマッチング候補を見つける
    const result: ExtractedMatching = {
      maleUser: {
        searchQuery: extracted.maleUser?.searchQuery || '',
        suggestedId: null,
        suggestedName: null,
        confidence: extracted.maleUser?.confidence || 'low',
        reason: extracted.maleUser?.reason || '',
      },
      femaleUser: {
        searchQuery: extracted.femaleUser?.searchQuery || '',
        suggestedId: null,
        suggestedName: null,
        confidence: extracted.femaleUser?.confidence || 'low',
        reason: extracted.femaleUser?.reason || '',
      },
      dateTime: {
        suggestedStartAt: extracted.dateTime?.suggestedStartAt || null,
        suggestedEndAt: extracted.dateTime?.suggestedEndAt || null,
        confidence: extracted.dateTime?.confidence || 'low',
        reason: extracted.dateTime?.reason || '',
      },
      venue: {
        suggestedName: extracted.venue?.suggestedName || null,
        confidence: extracted.venue?.confidence || 'low',
        reason: extracted.venue?.reason || '',
      },
      notes: {
        suggestedValue: extracted.notes?.suggestedValue || null,
        confidence: extracted.notes?.confidence || 'low',
        reason: extracted.notes?.reason || '',
      },
    };

    // 男性会員を検索
    if (result.maleUser.searchQuery) {
      const maleUser = await prisma.user.findFirst({
        where: {
          gender: 1,
          currentStatus: 'approved',
          OR: [
            { lastName: { contains: result.maleUser.searchQuery } },
            { firstName: { contains: result.maleUser.searchQuery } },
          ],
        },
        select: { id: true, lastName: true, firstName: true },
      });
      if (maleUser) {
        result.maleUser.suggestedId = maleUser.id.toString();
        result.maleUser.suggestedName = `${maleUser.lastName} ${maleUser.firstName}`;
      }
    }

    // 女性会員を検索
    if (result.femaleUser.searchQuery) {
      const femaleUser = await prisma.user.findFirst({
        where: {
          gender: 2,
          currentStatus: 'approved',
          OR: [
            { lastName: { contains: result.femaleUser.searchQuery } },
            { firstName: { contains: result.femaleUser.searchQuery } },
          ],
        },
        select: { id: true, lastName: true, firstName: true },
      });
      if (femaleUser) {
        result.femaleUser.suggestedId = femaleUser.id.toString();
        result.femaleUser.suggestedName = `${femaleUser.lastName} ${femaleUser.firstName}`;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Extract matching error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
