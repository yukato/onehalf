import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCompanyAccessToken } from '@/lib/company-auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ detail: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = await verifyCompanyAccessToken(token);

    if (!payload) {
      return NextResponse.json({ detail: 'Invalid or expired token' }, { status: 401 });
    }

    const user = await prisma.companyUser.findUnique({
      where: { id: BigInt(payload.sub) },
      include: { company: true },
    });

    if (!user || !user.isActive || !user.company.isActive) {
      return NextResponse.json({ detail: 'User not found or inactive' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        company: {
          id: user.company.id.toString(),
          name: user.company.name,
          slug: user.company.slug,
        },
      },
    });
  } catch (error) {
    console.error('Company get me error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
