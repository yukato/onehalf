import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  verifyPassword,
  createCompanyAccessToken,
  createCompanyRefreshToken,
} from '@/lib/company-auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ detail: 'Email and password are required' }, { status: 400 });
    }

    // Find user by email across all companies
    const user = await prisma.companyUser.findFirst({
      where: { email },
      include: { company: true },
    });

    if (!user || !user.isActive || !user.company.isActive) {
      return NextResponse.json({ detail: 'Invalid email or password' }, { status: 401 });
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ detail: 'Invalid email or password' }, { status: 401 });
    }

    // Update last login
    await prisma.companyUser.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create tokens
    const userIdStr = user.id.toString();
    const companyIdStr = user.companyId.toString();
    const accessToken = await createCompanyAccessToken({
      id: userIdStr,
      username: user.username,
      role: user.role,
      companyId: companyIdStr,
      companySlug: user.company.slug,
    });
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      undefined;
    const refreshToken = await createCompanyRefreshToken(userIdStr, userAgent, ipAddress);

    // Set refresh token cookie
    const response = NextResponse.json({
      access_token: accessToken,
      token_type: 'bearer',
      companySlug: user.company.slug,
      user: {
        id: userIdStr,
        username: user.username,
        email: user.email,
        role: user.role,
        company: {
          id: companyIdStr,
          name: user.company.name,
          slug: user.company.slug,
        },
      },
    });

    response.cookies.set('company_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Company login error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
