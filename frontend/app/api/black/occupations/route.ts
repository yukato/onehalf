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

// GET /api/black/occupations - 職業一覧取得
export async function GET(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const occupations = await prisma.occupation.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      occupations,
      total: occupations.length,
    });
  } catch (error) {
    console.error('Get occupations error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/black/occupations - 職業作成
export async function POST(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    if (!data.name) {
      return NextResponse.json({ detail: 'Name is required' }, { status: 400 });
    }

    const occupation = await prisma.occupation.create({
      data: {
        name: data.name,
        sortOrder: data.sortOrder ?? 0,
      },
    });

    return NextResponse.json(occupation, { status: 201 });
  } catch (error) {
    console.error('Create occupation error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
