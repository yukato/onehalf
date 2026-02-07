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

// GET /api/black/interview-types/[id] - 面談種類詳細取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const interviewType = await prisma.interviewType.findUnique({
      where: { id: BigInt(id) },
    });

    if (!interviewType) {
      return NextResponse.json({ detail: 'Interview type not found' }, { status: 404 });
    }

    return NextResponse.json(
      serializeInterviewType(interviewType as unknown as Record<string, unknown>)
    );
  } catch (error) {
    console.error('Get interview type error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/black/interview-types/[id] - 面談種類更新
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    // 既存確認
    const existing = await prisma.interviewType.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existing) {
      return NextResponse.json({ detail: 'Interview type not found' }, { status: 404 });
    }

    // コード重複チェック（自分以外）
    if (data.code && data.code !== existing.code) {
      const duplicate = await prisma.interviewType.findUnique({
        where: { code: data.code.trim() },
      });
      if (duplicate) {
        return NextResponse.json({ detail: 'このコードは既に使用されています' }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.code !== undefined) updateData.code = data.code.trim();
    if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes;
    if (data.targetGender !== undefined) updateData.targetGender = data.targetGender;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const interviewType = await prisma.interviewType.update({
      where: { id: BigInt(id) },
      data: updateData,
    });

    return NextResponse.json(
      serializeInterviewType(interviewType as unknown as Record<string, unknown>)
    );
  } catch (error) {
    console.error('Update interview type error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/black/interview-types/[id] - 面談種類削除
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
    const existing = await prisma.interviewType.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existing) {
      return NextResponse.json({ detail: 'Interview type not found' }, { status: 404 });
    }

    // 使用中の面談があるかチェック
    const interviewCount = await prisma.interview.count({
      where: { interviewTypeId: BigInt(id) },
    });

    if (interviewCount > 0) {
      return NextResponse.json(
        { detail: `この面談種類は ${interviewCount} 件の面談で使用されているため削除できません` },
        { status: 400 }
      );
    }

    await prisma.interviewType.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete interview type error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
