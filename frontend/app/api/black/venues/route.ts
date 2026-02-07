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
function serializeVenue(venue: Record<string, unknown>) {
  return {
    ...venue,
    id: venue.id?.toString(),
  };
}

// GET /api/black/venues - レストラン一覧取得
export async function GET(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const prefectureId = searchParams.get('prefectureId');
    const genre = searchParams.get('genre');

    const where: Record<string, unknown> = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (prefectureId) {
      where.prefectureId = parseInt(prefectureId);
    }

    if (genre) {
      where.genre = { contains: genre };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { genre: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const venues = await prisma.matchingVenue.findMany({
      where,
      include: {
        prefecture: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      venues: venues.map(serializeVenue),
      total: venues.length,
    });
  } catch (error) {
    console.error('Get venues error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/black/venues - レストラン作成
export async function POST(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    if (!data.name || !data.name.trim()) {
      return NextResponse.json({ detail: '店名は必須です' }, { status: 400 });
    }

    const venue = await prisma.matchingVenue.create({
      data: {
        name: data.name.trim(),
        genre: data.genre?.trim() || null,
        phoneNumber: data.phoneNumber?.trim() || null,
        postalCode: data.postalCode?.trim() || null,
        prefectureId: data.prefectureId || null,
        city: data.city?.trim() || null,
        address: data.address?.trim() || null,
        googleMapUrl: data.googleMapUrl?.trim() || null,
        url: data.url?.trim() || null,
        notes: data.notes?.trim() || null,
        isActive: data.isActive ?? true,
      },
      include: {
        prefecture: true,
      },
    });

    return NextResponse.json(serializeVenue(venue as unknown as Record<string, unknown>), {
      status: 201,
    });
  } catch (error) {
    console.error('Create venue error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
