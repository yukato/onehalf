import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  verifyCompanyRefreshToken,
  createCompanyAccessToken,
  createCompanyRefreshToken,
  revokeCompanyRefreshToken,
} from '@/lib/company-auth';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('company_refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ detail: 'Refresh token not found' }, { status: 401 });
    }

    const verified = await verifyCompanyRefreshToken(refreshToken);
    if (!verified) {
      const response = NextResponse.json(
        { detail: 'Invalid or expired refresh token' },
        { status: 401 }
      );
      response.cookies.delete('company_refresh_token');
      return response;
    }

    const user = await prisma.companyUser.findUnique({
      where: { id: BigInt(verified.userId) },
      include: { company: true },
    });

    if (!user || !user.isActive || !user.company.isActive) {
      await revokeCompanyRefreshToken(refreshToken);
      const response = NextResponse.json(
        { detail: 'User not found or inactive' },
        { status: 401 }
      );
      response.cookies.delete('company_refresh_token');
      return response;
    }

    // Rotate refresh token
    await revokeCompanyRefreshToken(refreshToken);
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      undefined;
    const userIdStr = user.id.toString();
    const newRefreshToken = await createCompanyRefreshToken(userIdStr, userAgent, ipAddress);

    // Create new access token
    const accessToken = await createCompanyAccessToken({
      id: userIdStr,
      username: user.username,
      role: user.role,
      companyId: user.companyId.toString(),
      companySlug: user.company.slug,
    });

    const response = NextResponse.json({
      access_token: accessToken,
      token_type: 'bearer',
    });

    response.cookies.set('company_refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Company refresh error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
