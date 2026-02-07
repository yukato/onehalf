import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ detail: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = await verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json({ detail: 'Invalid or expired token' }, { status: 401 });
    }

    const user = await prisma.adminUser.findUnique({
      where: { id: BigInt(payload.sub) },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ detail: 'User not found or inactive' }, { status: 401 });
    }

    return NextResponse.json({ user: { ...user, id: user.id.toString() } });
  } catch (error) {
    console.error('Get me error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
