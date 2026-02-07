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

// PUT /api/black/users/[id]/files/[fileId]/primary - メイン画像に設定
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id, fileId } = await params;
    const userId = BigInt(id);
    const userFileId = BigInt(fileId);

    // 対象ファイルの取得
    const userFile = await prisma.userFile.findFirst({
      where: {
        id: userFileId,
        userId,
      },
    });

    if (!userFile) {
      return NextResponse.json({ detail: 'File not found' }, { status: 404 });
    }

    // 同じtypeの他のファイルのisPrimaryをfalseに
    await prisma.userFile.updateMany({
      where: { userId, type: userFile.type, isPrimary: true },
      data: { isPrimary: false },
    });

    // 対象ファイルをisPrimary=trueに
    await prisma.userFile.update({
      where: { id: userFileId },
      data: { isPrimary: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update primary error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
