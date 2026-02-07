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

// 曜日タイプのラベル
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

// GET /api/black/users/[id]/availability-patterns - 空き時間パターン一覧取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // ユーザー存在確認
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
    });

    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    const patterns = await prisma.userAvailabilityPattern.findMany({
      where: { userId: BigInt(id) },
      orderBy: [{ isActive: 'desc' }, { dayType: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({
      patterns: patterns.map((p) => ({
        id: p.id.toString(),
        userId: p.userId.toString(),
        dayType: p.dayType,
        dayTypeLabel: DAY_TYPE_LABELS[p.dayType] || p.dayType,
        startTime: p.startTime,
        endTime: p.endTime,
        notes: p.notes,
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get availability patterns error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/black/users/[id]/availability-patterns - 空き時間パターン追加
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    // ユーザー存在確認
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
    });

    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    // バリデーション
    if (!data.dayType || !data.startTime || !data.endTime) {
      return NextResponse.json({ detail: '曜日、開始時間、終了時間は必須です' }, { status: 400 });
    }

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

    const pattern = await prisma.userAvailabilityPattern.create({
      data: {
        userId: BigInt(id),
        dayType: data.dayType,
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes?.trim() || null,
        isActive: data.isActive ?? true,
      },
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
    console.error('Create availability pattern error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
