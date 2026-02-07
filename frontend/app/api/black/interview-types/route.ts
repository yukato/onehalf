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
function serializeInterviewType(type: Record<string, unknown>): Record<string, unknown> {
  return {
    ...type,
    id: type.id?.toString(),
  };
}

// GET /api/black/interview-types - 面談種類一覧取得
export async function GET(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const targetGender = searchParams.get('targetGender');

    const where: Record<string, unknown> = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (targetGender) {
      where.OR = [{ targetGender: parseInt(targetGender) }, { targetGender: null }];
    }

    const interviewTypes = await prisma.interviewType.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      interviewTypes: interviewTypes.map((t) =>
        serializeInterviewType(t as unknown as Record<string, unknown>)
      ),
      total: interviewTypes.length,
    });
  } catch (error) {
    console.error('Get interview types error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/black/interview-types - 面談種類作成
export async function POST(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // バリデーション
    if (!data.name?.trim()) {
      return NextResponse.json({ detail: '名前は必須です' }, { status: 400 });
    }
    if (!data.code?.trim()) {
      return NextResponse.json({ detail: 'コードは必須です' }, { status: 400 });
    }

    // コード重複チェック
    const existing = await prisma.interviewType.findUnique({
      where: { code: data.code.trim() },
    });
    if (existing) {
      return NextResponse.json({ detail: 'このコードは既に使用されています' }, { status: 400 });
    }

    const interviewType = await prisma.interviewType.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim(),
        durationMinutes: data.durationMinutes || 60,
        targetGender: data.targetGender ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });

    return NextResponse.json(
      serializeInterviewType(interviewType as unknown as Record<string, unknown>),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create interview type error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
