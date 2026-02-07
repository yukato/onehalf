import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';

// 認証チェック
async function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  return verifyAccessToken(token);
}

// BigIntをstringに変換
function serializePreferenceType(pt: Record<string, unknown>): Record<string, unknown> {
  return {
    ...pt,
    id: pt.id?.toString(),
  };
}

// GET /api/black/preference-types - 希望条件タイプ一覧取得
export async function GET(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetGender = searchParams.get('targetGender');

    const where: Record<string, unknown> = {
      isActive: true,
    };

    // 性別フィルタ（指定された性別向け + 両方向けのもの）
    if (targetGender) {
      where.OR = [{ targetGender: parseInt(targetGender) }, { targetGender: null }];
    }

    const preferenceTypes = await prisma.userPreferenceType.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      preferenceTypes: preferenceTypes.map((pt) =>
        serializePreferenceType(pt as unknown as Record<string, unknown>)
      ),
    });
  } catch (error) {
    console.error('Get preference types error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
