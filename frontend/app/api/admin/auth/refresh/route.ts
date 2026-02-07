import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  verifyRefreshToken,
  createAccessToken,
  createRefreshToken,
  revokeRefreshToken,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ detail: 'Refresh token not found' }, { status: 401 });
    }

    const verified = await verifyRefreshToken(refreshToken);
    if (!verified) {
      const response = NextResponse.json(
        { detail: 'Invalid or expired refresh token' },
        { status: 401 }
      );
      response.cookies.delete('refresh_token');
      return response;
    }

    const user = await prisma.adminUser.findUnique({
      where: { id: BigInt(verified.userId) },
    });

    if (!user || !user.isActive) {
      await revokeRefreshToken(refreshToken);
      const response = NextResponse.json({ detail: 'User not found or inactive' }, { status: 401 });
      response.cookies.delete('refresh_token');
      return response;
    }

    // Rotate refresh token
    await revokeRefreshToken(refreshToken);
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      undefined;
    const userIdStr = user.id.toString();
    const newRefreshToken = await createRefreshToken(userIdStr, userAgent, ipAddress);

    // Create new access token
    const accessToken = await createAccessToken({
      id: userIdStr,
      username: user.username,
      role: user.role,
    });

    const response = NextResponse.json({
      access_token: accessToken,
      token_type: 'bearer',
    });

    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
