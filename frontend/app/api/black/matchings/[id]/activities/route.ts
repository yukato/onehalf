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

// BigIntをstringに変換するシリアライザ
function serializeLog(log: Record<string, unknown>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    ...log,
    id: log.id?.toString(),
    matchingId: log.matchingId?.toString(),
    adminUserId: log.adminUserId?.toString(),
  };

  if (log.adminUser && typeof log.adminUser === 'object') {
    const adminUser = log.adminUser as Record<string, unknown>;
    serialized.adminUser = {
      id: adminUser.id?.toString(),
      username: adminUser.username,
    };
  }

  return serialized;
}

// GET /api/black/matchings/[id]/activities - アクティビティログ一覧
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // マッチング存在確認
    const matching = await prisma.matching.findUnique({
      where: { id: BigInt(id) },
    });

    if (!matching) {
      return NextResponse.json({ detail: 'Matching not found' }, { status: 404 });
    }

    const logs = await prisma.matchingActivityLog.findMany({
      where: { matchingId: BigInt(id) },
      include: {
        adminUser: {
          select: { id: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      logs: logs.map((log) => serializeLog(log as unknown as Record<string, unknown>)),
    });
  } catch (error) {
    console.error('Get matching activity logs error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/black/matchings/[id]/activities - コメント追加
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    if (!data.content?.trim()) {
      return NextResponse.json({ detail: 'コメントを入力してください' }, { status: 400 });
    }

    // マッチング存在確認
    const matching = await prisma.matching.findUnique({
      where: { id: BigInt(id) },
    });

    if (!matching) {
      return NextResponse.json({ detail: 'Matching not found' }, { status: 404 });
    }

    const log = await prisma.matchingActivityLog.create({
      data: {
        matchingId: BigInt(id),
        adminUserId: BigInt(payload.sub),
        type: 'comment',
        content: data.content.trim(),
      },
      include: {
        adminUser: {
          select: { id: true, username: true },
        },
      },
    });

    return NextResponse.json(serializeLog(log as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Create matching activity log error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
