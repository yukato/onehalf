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
function serializePreference(pref: Record<string, unknown>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    ...pref,
    id: pref.id?.toString(),
    userId: pref.userId?.toString(),
    preferenceTypeId: pref.preferenceTypeId?.toString(),
  };

  if (pref.preferenceType && typeof pref.preferenceType === 'object') {
    const pt = pref.preferenceType as Record<string, unknown>;
    serialized.preferenceType = {
      ...pt,
      id: pt.id?.toString(),
    };
  }

  return serialized;
}

// GET /api/black/users/[id]/preferences - ユーザーの希望条件取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // ユーザー存在チェック
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
    });

    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    const preferences = await prisma.userPreference.findMany({
      where: { userId: BigInt(id) },
      include: {
        preferenceType: true,
      },
      orderBy: {
        preferenceType: {
          sortOrder: 'asc',
        },
      },
    });

    return NextResponse.json({
      preferences: preferences.map((p) =>
        serializePreference(p as unknown as Record<string, unknown>)
      ),
    });
  } catch (error) {
    console.error('Get user preferences error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/black/users/[id]/preferences - ユーザーの希望条件を一括保存
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    // ユーザー存在チェック
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
    });

    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    const { preferences } = data as { preferences: { preferenceTypeId: string; value: unknown }[] };

    if (!Array.isArray(preferences)) {
      return NextResponse.json({ detail: 'preferences must be an array' }, { status: 400 });
    }

    // トランザクションで一括更新
    await prisma.$transaction(async (tx) => {
      for (const pref of preferences) {
        const preferenceTypeId = BigInt(pref.preferenceTypeId);

        // preferenceType存在チェック
        const preferenceType = await tx.userPreferenceType.findUnique({
          where: { id: preferenceTypeId },
        });

        if (!preferenceType) {
          throw new Error(`PreferenceType ${pref.preferenceTypeId} not found`);
        }

        // upsert（存在すれば更新、なければ作成）
        await tx.userPreference.upsert({
          where: {
            userId_preferenceTypeId: {
              userId: BigInt(id),
              preferenceTypeId,
            },
          },
          update: {
            value: pref.value as object,
          },
          create: {
            userId: BigInt(id),
            preferenceTypeId,
            value: pref.value as object,
          },
        });
      }
    });

    // 更新後のデータを返す
    const updatedPreferences = await prisma.userPreference.findMany({
      where: { userId: BigInt(id) },
      include: {
        preferenceType: true,
      },
      orderBy: {
        preferenceType: {
          sortOrder: 'asc',
        },
      },
    });

    return NextResponse.json({
      preferences: updatedPreferences.map((p) =>
        serializePreference(p as unknown as Record<string, unknown>)
      ),
    });
  } catch (error) {
    console.error('Save user preferences error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/black/users/[id]/preferences - 特定の希望条件を削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const preferenceTypeId = searchParams.get('preferenceTypeId');

    if (!preferenceTypeId) {
      return NextResponse.json({ detail: 'preferenceTypeId is required' }, { status: 400 });
    }

    // ユーザー存在チェック
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
    });

    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    await prisma.userPreference.deleteMany({
      where: {
        userId: BigInt(id),
        preferenceTypeId: BigInt(preferenceTypeId),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user preference error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
