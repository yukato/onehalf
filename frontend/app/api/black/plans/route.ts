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

// GET /api/black/plans - プラン一覧取得
export async function GET(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const plans = await prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      plans,
      total: plans.length,
    });
  } catch (error) {
    console.error('Get plans error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/black/plans - プラン作成
export async function POST(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    if (!data.name || !data.code) {
      return NextResponse.json({ detail: 'Name and code are required' }, { status: 400 });
    }

    // codeの重複チェック
    const existing = await prisma.plan.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      return NextResponse.json({ detail: 'Plan with this code already exists' }, { status: 400 });
    }

    const plan = await prisma.plan.create({
      data: {
        name: data.name,
        code: data.code,
        sortOrder: data.sortOrder ?? 0,
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error('Create plan error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
