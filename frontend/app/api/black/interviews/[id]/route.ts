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

// GET /api/black/interviews/[id] - 面談詳細取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const interview = await prisma.interview.findUnique({
      where: { id: BigInt(id) },
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

    if (!interview) {
      return NextResponse.json({ detail: 'Interview not found' }, { status: 404 });
    }

    return NextResponse.json(serializeInterview(interview as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Get interview error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/black/interviews/[id] - 面談更新
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    // 既存確認
    const existing = await prisma.interview.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existing) {
      return NextResponse.json({ detail: 'Interview not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (data.interviewTypeId !== undefined) {
      const interviewType = await prisma.interviewType.findUnique({
        where: { id: BigInt(data.interviewTypeId) },
      });
      if (!interviewType) {
        return NextResponse.json({ detail: '面談種類が見つかりません' }, { status: 400 });
      }
      updateData.interviewTypeId = BigInt(data.interviewTypeId);
    }

    if (data.userId !== undefined) {
      if (data.userId === null) {
        updateData.userId = null;
      } else {
        const user = await prisma.user.findUnique({
          where: { id: BigInt(data.userId) },
        });
        if (!user) {
          return NextResponse.json({ detail: 'ユーザーが見つかりません' }, { status: 400 });
        }
        updateData.userId = BigInt(data.userId);
      }
    }

    if (data.guestName !== undefined) updateData.guestName = data.guestName.trim();
    if (data.guestEmail !== undefined) updateData.guestEmail = data.guestEmail?.trim() || null;
    if (data.guestPhone !== undefined) updateData.guestPhone = data.guestPhone?.trim() || null;
    if (data.scheduledAt !== undefined) updateData.scheduledAt = new Date(data.scheduledAt);
    if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes;
    if (data.meetingUrl !== undefined) updateData.meetingUrl = data.meetingUrl?.trim() || null;
    if (data.currentStatus !== undefined) updateData.currentStatus = data.currentStatus;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

    const interview = await prisma.interview.update({
      where: { id: BigInt(id) },
      data: updateData,
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

    return NextResponse.json(serializeInterview(interview as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Update interview error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/black/interviews/[id] - 面談削除
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

    // 既存確認
    const existing = await prisma.interview.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existing) {
      return NextResponse.json({ detail: 'Interview not found' }, { status: 404 });
    }

    await prisma.interview.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete interview error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
