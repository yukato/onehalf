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

// GET /api/black/venues/[id] - レストラン詳細取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const venue = await prisma.matchingVenue.findUnique({
      where: { id: BigInt(id) },
      include: {
        prefecture: true,
      },
    });

    if (!venue) {
      return NextResponse.json({ detail: 'Venue not found' }, { status: 404 });
    }

    return NextResponse.json(serializeVenue(venue as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Get venue error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/black/venues/[id] - レストラン更新
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    // 既存確認
    const existing = await prisma.matchingVenue.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existing) {
      return NextResponse.json({ detail: 'Venue not found' }, { status: 404 });
    }

    if (data.name !== undefined && !data.name.trim()) {
      return NextResponse.json({ detail: '店名は必須です' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.genre !== undefined) updateData.genre = data.genre?.trim() || null;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber?.trim() || null;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode?.trim() || null;
    if (data.prefectureId !== undefined) updateData.prefectureId = data.prefectureId || null;
    if (data.city !== undefined) updateData.city = data.city?.trim() || null;
    if (data.address !== undefined) updateData.address = data.address?.trim() || null;
    if (data.googleMapUrl !== undefined)
      updateData.googleMapUrl = data.googleMapUrl?.trim() || null;
    if (data.url !== undefined) updateData.url = data.url?.trim() || null;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const venue = await prisma.matchingVenue.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: {
        prefecture: true,
      },
    });

    return NextResponse.json(serializeVenue(venue as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Update venue error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/black/venues/[id] - レストラン削除
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
    const existing = await prisma.matchingVenue.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existing) {
      return NextResponse.json({ detail: 'Venue not found' }, { status: 404 });
    }

    // マッチングで使用中かチェック
    const usedCount = await prisma.matching.count({
      where: { venueId: BigInt(id) },
    });

    if (usedCount > 0) {
      return NextResponse.json(
        { detail: `このレストランは${usedCount}件のマッチングで使用中のため削除できません` },
        { status: 400 }
      );
    }

    await prisma.matchingVenue.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete venue error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
