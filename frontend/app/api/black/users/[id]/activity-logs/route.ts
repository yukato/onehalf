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
function serializeLog(log: Record<string, unknown>) {
  const adminUser = log.adminUser as Record<string, unknown> | undefined;
  return {
    ...log,
    id: log.id?.toString(),
    userId: log.userId?.toString(),
    adminUserId: log.adminUserId?.toString(),
    adminUser: adminUser
      ? {
          ...adminUser,
          id: adminUser.id?.toString(),
        }
      : undefined,
  };
}

// GET /api/black/users/[id]/activity-logs - アクティビティログ一覧取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const logs = await prisma.userActivityLog.findMany({
      where: { userId: BigInt(id) },
      include: {
        adminUser: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      logs: logs.map(serializeLog),
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/black/users/[id]/activity-logs - アクティビティログ追加
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    if (!data.content || !data.content.trim()) {
      return NextResponse.json({ detail: 'Content is required' }, { status: 400 });
    }

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
    });
    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    const log = await prisma.userActivityLog.create({
      data: {
        userId: BigInt(id),
        adminUserId: BigInt(payload.sub),
        content: data.content.trim(),
      },
      include: {
        adminUser: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(serializeLog(log), { status: 201 });
  } catch (error) {
    console.error('Create activity log error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
