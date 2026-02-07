import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createAccessToken, createRefreshToken } from '@/lib/auth';

// Pythonバックエンドのログイベント記録API
const PYTHON_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8100';
const BASIC_AUTH_USER = process.env.NEXT_PUBLIC_BASIC_AUTH_USER || 'admin';
const BASIC_AUTH_PASSWORD = process.env.NEXT_PUBLIC_BASIC_AUTH_PASSWORD || 'admin123';
const BASIC_AUTH_HEADER = `Basic ${Buffer.from(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASSWORD}`).toString('base64')}`;

async function logAdminLoginEvent(
  adminUserId: string,
  adminUsername: string,
  eventType: string = 'login'
): Promise<void> {
  try {
    await fetch(`${PYTHON_API_BASE}/api/admin/log-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Basic-Auth': BASIC_AUTH_HEADER,
      },
      body: JSON.stringify({
        admin_user_id: adminUserId,
        admin_username: adminUsername,
        event_type: eventType,
      }),
    });
  } catch (error) {
    // ログ記録の失敗はユーザー体験に影響しないよう、警告のみ
    console.warn('Failed to log admin login event:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ detail: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ detail: 'Invalid username or password' }, { status: 401 });
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ detail: 'Invalid username or password' }, { status: 401 });
    }

    // Update last login
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create tokens
    const userIdStr = user.id.toString();
    const accessToken = await createAccessToken({
      id: userIdStr,
      username: user.username,
      role: user.role,
    });
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      undefined;
    const refreshToken = await createRefreshToken(userIdStr, userAgent, ipAddress);

    // ログインイベントをバックエンドに記録（非同期、待機しない）
    logAdminLoginEvent(userIdStr, user.username, 'login');

    // Set refresh token cookie
    const response = NextResponse.json({
      access_token: accessToken,
      token_type: 'bearer',
      user: {
        id: userIdStr,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
