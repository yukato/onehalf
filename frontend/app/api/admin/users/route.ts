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

// GET /api/admin/users - ユーザー一覧取得
export async function GET(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.adminUser.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // BigIntをstringに変換
    const serializedUsers = users.map((user) => ({
      ...user,
      id: user.id.toString(),
    }));

    return NextResponse.json({ users: serializedUsers, total: users.length });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/users - ユーザー作成
export async function POST(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    // super_admin のみ作成可能
    if (payload.role !== 'super_admin') {
      return NextResponse.json({ detail: 'Permission denied' }, { status: 403 });
    }

    const { username, email, password, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ detail: 'Email and password are required' }, { status: 400 });
    }

    // メールの重複チェック
    const existingEmail = await prisma.adminUser.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingEmail) {
      return NextResponse.json({ detail: 'Email already exists' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.adminUser.create({
      data: {
        email,
        username: username || email.split('@')[0], // 表示名がなければメールのローカル部分を使用
        password: hashedPassword,
        role: role || 'admin',
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ...user, id: user.id.toString() }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
