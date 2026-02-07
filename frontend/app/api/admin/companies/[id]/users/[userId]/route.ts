import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { hashPassword } from '@/lib/company-auth';

async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyAccessToken(authHeader.slice(7));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id, userId } = await params;
    const { email, username, password, role, isActive } = await request.json();

    // Check email uniqueness within company if changing
    if (email) {
      const existing = await prisma.companyUser.findFirst({
        where: {
          companyId: BigInt(id),
          email,
          NOT: { id: BigInt(userId) },
        },
      });
      if (existing) {
        return NextResponse.json(
          { detail: 'A user with this email already exists in this company' },
          { status: 409 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (email !== undefined) data.email = email;
    if (username !== undefined) data.username = username;
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    if (password) data.password = await hashPassword(password);

    const user = await prisma.companyUser.update({
      where: { id: BigInt(userId) },
      data,
    });

    return NextResponse.json({
      id: user.id.toString(),
      companyId: user.companyId.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLogin: user.lastLogin?.toISOString() || null,
    });
  } catch (error) {
    console.error('Update company user error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    await prisma.companyUser.delete({ where: { id: BigInt(userId) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete company user error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
