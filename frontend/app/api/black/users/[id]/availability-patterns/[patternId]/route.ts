import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';

async function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  return verifyAccessToken(token);
}

const DAY_TYPE_LABELS: Record<string, string> = {
  weekday: '平日',
  monday: '月曜日',
  tuesday: '火曜日',
  wednesday: '水曜日',
  thursday: '木曜日',
  friday: '金曜日',
  saturday: '土曜日',
  sunday: '日曜日',
  holiday: '祝日',
};

// PUT /api/black/users/[id]/availability-patterns/[patternId] - 空き時間パターン更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; patternId: string }> }
) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id, patternId } = await params;
    const data = await request.json();

    // パターン存在確認
    const existing = await prisma.userAvailabilityPattern.findFirst({
      where: {
        id: BigInt(patternId),
        userId: BigInt(id),
      },
    });

    if (!existing) {
      return NextResponse.json({ detail: 'Pattern not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (data.dayType !== undefined) {
      const validDayTypes = [
        'weekday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
        'holiday',
      ];
      if (!validDayTypes.includes(data.dayType)) {
        return NextResponse.json({ detail: '無効な曜日タイプです' }, { status: 400 });
      }
      updateData.dayType = data.dayType;
    }

    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const pattern = await prisma.userAvailabilityPattern.update({
      where: { id: BigInt(patternId) },
      data: updateData,
    });

    return NextResponse.json({
      id: pattern.id.toString(),
      userId: pattern.userId.toString(),
      dayType: pattern.dayType,
      dayTypeLabel: DAY_TYPE_LABELS[pattern.dayType] || pattern.dayType,
      startTime: pattern.startTime,
      endTime: pattern.endTime,
      notes: pattern.notes,
      isActive: pattern.isActive,
      createdAt: pattern.createdAt.toISOString(),
      updatedAt: pattern.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Update availability pattern error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/black/users/[id]/availability-patterns/[patternId] - 空き時間パターン削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; patternId: string }> }
) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id, patternId } = await params;

    // パターン存在確認
    const existing = await prisma.userAvailabilityPattern.findFirst({
      where: {
        id: BigInt(patternId),
        userId: BigInt(id),
      },
    });

    if (!existing) {
      return NextResponse.json({ detail: 'Pattern not found' }, { status: 404 });
    }

    await prisma.userAvailabilityPattern.delete({
      where: { id: BigInt(patternId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete availability pattern error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
