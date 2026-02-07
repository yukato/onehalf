import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { getFileUrl } from '@/lib/s3';

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
function serializeUser(user: Record<string, unknown>) {
  const serialized: Record<string, unknown> = {
    ...user,
    id: user.id?.toString(),
    bdUserId: user.bdUserId?.toString(),
  };

  // プロフィール画像URL
  const userFiles = user.userFiles as
    | Array<{ file: { path: string }; isPrimary: boolean; sortOrder: number }>
    | undefined;
  if (userFiles && userFiles.length > 0) {
    // プライマリ画像またはソート順最初の画像をメインとして使用
    const primaryFile = userFiles.find((f) => f.isPrimary) || userFiles[0];
    serialized.profileImageUrl = getFileUrl(primaryFile.file.path);
    // 全プロフィール画像のURL一覧
    serialized.profileImages = userFiles.map((f) => getFileUrl(f.file.path));
  } else {
    serialized.profileImageUrl = null;
    serialized.profileImages = [];
  }

  // userFilesは返さない
  delete serialized.userFiles;

  return serialized;
}

// GET /api/black/users/[id] - ユーザー詳細取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
      include: {
        occupation: true,
        plan: true,
        prefecture: true,
        userFiles: {
          where: {
            type: 'profile',
          },
          include: {
            file: true,
          },
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
      },
    });

    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(serializeUser(user));
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/black/users/[id] - ユーザー更新
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    // ユーザーの存在確認
    const existing = await prisma.user.findUnique({
      where: { id: BigInt(id) },
    });
    if (!existing) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.mobileNumber !== undefined) updateData.mobileNumber = data.mobileNumber || null;
    if (data.birthday !== undefined)
      updateData.birthday = data.birthday ? new Date(data.birthday) : null;
    if (data.occupationId !== undefined) updateData.occupationId = data.occupationId || null;
    if (data.prefectureId !== undefined) updateData.prefectureId = data.prefectureId || null;
    if (data.currentStatus !== undefined) updateData.currentStatus = data.currentStatus;
    if (data.planId !== undefined) updateData.planId = data.planId || null;
    if (data.planStartedAt !== undefined)
      updateData.planStartedAt = data.planStartedAt ? new Date(data.planStartedAt) : null;
    if (data.score !== undefined) updateData.score = data.score;

    const user = await prisma.user.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: {
        occupation: true,
        plan: true,
        prefecture: true,
        userFiles: {
          where: {
            type: 'profile',
          },
          include: {
            file: true,
          },
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
      },
    });

    return NextResponse.json(serializeUser(user));
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/black/users/[id] - ユーザー削除（論理削除）
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

    // ユーザーの存在確認
    const existing = await prisma.user.findUnique({
      where: { id: BigInt(id) },
    });
    if (!existing) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    // 論理削除
    await prisma.user.update({
      where: { id: BigInt(id) },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
