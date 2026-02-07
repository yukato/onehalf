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

// GET /api/black/prefectures - 都道府県一覧取得
export async function GET(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const prefectures = await prisma.prefecture.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(prefectures);
  } catch (error) {
    console.error('Get prefectures error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
