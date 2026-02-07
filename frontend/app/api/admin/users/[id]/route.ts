import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken, hashPassword } from '@/lib/auth';

// 認証チェック
async function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  return verifyAccessToken(token);
}

// GET /api/admin/users/[id] - 単一ユーザー取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.adminUser.findUnique({
      where: { id: BigInt(id) },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ ...user, id: user.id.toString() });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/users/[id] - ユーザー更新
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { username, email, password, role, isActive } = await request.json();

    // 既存ユーザーの確認
    const existingUser = await prisma.adminUser.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existingUser) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    // 自分以外のユーザーを編集する場合は super_admin が必要
    if (id !== payload.sub && payload.role !== 'super_admin') {
      return NextResponse.json({ detail: 'Permission denied' }, { status: 403 });
    }

    // role変更は super_admin のみ
    if (role && role !== existingUser.role && payload.role !== 'super_admin') {
      return NextResponse.json({ detail: 'Only super_admin can change roles' }, { status: 403 });
    }

    // メールの重複チェック
    if (email && email !== existingUser.email) {
      const duplicateEmail = await prisma.adminUser.findUnique({
        where: { email },
      });
      if (duplicateEmail) {
        return NextResponse.json({ detail: 'Email already exists' }, { status: 400 });
      }
    }

    // 更新データの構築
    const updateData: Record<string, unknown> = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email; // emailは必須なので空にはできない
    if (password) updateData.password = await hashPassword(password);
    if (role && payload.role === 'super_admin') updateData.role = role;
    if (isActive !== undefined && payload.role === 'super_admin') {
      updateData.isActive = isActive;
    }

    const user = await prisma.adminUser.update({
      where: { id: BigInt(id) },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
    });

    return NextResponse.json({ ...user, id: user.id.toString() });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - ユーザー削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    // super_admin のみ削除可能
    if (payload.role !== 'super_admin') {
      return NextResponse.json({ detail: 'Permission denied' }, { status: 403 });
    }

    const { id } = await params;

    // 自分自身は削除できない
    if (id === payload.sub) {
      return NextResponse.json({ detail: 'Cannot delete yourself' }, { status: 400 });
    }

    // 既存ユーザーの確認
    const existingUser = await prisma.adminUser.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existingUser) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    // セッションも削除
    await prisma.adminSession.deleteMany({
      where: { userId: BigInt(id) },
    });

    await prisma.adminUser.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
