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
function serializeInterview(interview: Record<string, unknown>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    ...interview,
    id: interview.id?.toString(),
    interviewTypeId: interview.interviewTypeId?.toString(),
    userId: interview.userId?.toString() || null,
    adminUserId: interview.adminUserId?.toString(),
  };

  if (interview.interviewType && typeof interview.interviewType === 'object') {
    const interviewType = interview.interviewType as Record<string, unknown>;
    serialized.interviewType = {
      ...interviewType,
      id: interviewType.id?.toString(),
    };
  }

  if (interview.user && typeof interview.user === 'object') {
    const user = interview.user as Record<string, unknown>;
    serialized.user = {
      id: user.id?.toString(),
      lastName: user.lastName,
      firstName: user.firstName,
    };
  }

  if (interview.adminUser && typeof interview.adminUser === 'object') {
    const adminUser = interview.adminUser as Record<string, unknown>;
    serialized.adminUser = {
      id: adminUser.id?.toString(),
      username: adminUser.username,
    };
  }

  return serialized;
}

// GET /api/black/interviews - 面談一覧取得
export async function GET(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const typeId = searchParams.get('typeId') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const q = searchParams.get('q') || '';
    const userId = searchParams.get('userId') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};

    if (status) {
      where.currentStatus = status;
    }

    if (typeId) {
      where.interviewTypeId = BigInt(typeId);
    }

    if (fromDate) {
      where.scheduledAt = {
        ...((where.scheduledAt as object) || {}),
        gte: new Date(fromDate),
      };
    }

    if (toDate) {
      where.scheduledAt = {
        ...((where.scheduledAt as object) || {}),
        lte: new Date(toDate + 'T23:59:59'),
      };
    }

    if (userId) {
      where.userId = BigInt(userId);
    }

    // ゲスト名または紐付けユーザー名で検索
    if (q) {
      where.OR = [
        { guestName: { contains: q } },
        { guestEmail: { contains: q } },
        {
          user: {
            OR: [{ lastName: { contains: q } }, { firstName: { contains: q } }],
          },
        },
      ];
    }

    const [interviews, total] = await Promise.all([
      prisma.interview.findMany({
        where,
        include: {
          interviewType: true,
          user: {
            select: { id: true, lastName: true, firstName: true },
          },
          adminUser: {
            select: { id: true, username: true },
          },
        },
        orderBy: { scheduledAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.interview.count({ where }),
    ]);

    return NextResponse.json({
      interviews: interviews.map((i) =>
        serializeInterview(i as unknown as Record<string, unknown>)
      ),
      total,
    });
  } catch (error) {
    console.error('Get interviews error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/black/interviews - 面談作成
export async function POST(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // バリデーション
    if (!data.interviewTypeId) {
      return NextResponse.json({ detail: '面談種類は必須です' }, { status: 400 });
    }
    if (!data.guestName?.trim()) {
      return NextResponse.json({ detail: 'ゲスト名は必須です' }, { status: 400 });
    }
    if (!data.scheduledAt) {
      return NextResponse.json({ detail: '予約日時は必須です' }, { status: 400 });
    }

    // 面談種類確認
    const interviewType = await prisma.interviewType.findUnique({
      where: { id: BigInt(data.interviewTypeId) },
    });
    if (!interviewType) {
      return NextResponse.json({ detail: '面談種類が見つかりません' }, { status: 400 });
    }

    // ユーザー確認（指定された場合）
    if (data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: BigInt(data.userId) },
      });
      if (!user) {
        return NextResponse.json({ detail: 'ユーザーが見つかりません' }, { status: 400 });
      }
    }

    const interview = await prisma.interview.create({
      data: {
        interviewTypeId: BigInt(data.interviewTypeId),
        userId: data.userId ? BigInt(data.userId) : null,
        adminUserId: BigInt(payload.sub),
        guestName: data.guestName.trim(),
        guestEmail: data.guestEmail?.trim() || null,
        guestPhone: data.guestPhone?.trim() || null,
        scheduledAt: new Date(data.scheduledAt),
        durationMinutes: data.durationMinutes || interviewType.durationMinutes,
        meetingUrl: data.meetingUrl?.trim() || null,
        currentStatus: 'scheduled',
        notes: data.notes?.trim() || null,
      },
      include: {
        interviewType: true,
        user: {
          select: { id: true, lastName: true, firstName: true },
        },
        adminUser: {
          select: { id: true, username: true },
        },
      },
    });

    return NextResponse.json(serializeInterview(interview as unknown as Record<string, unknown>), {
      status: 201,
    });
  } catch (error) {
    console.error('Create interview error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
