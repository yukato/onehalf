import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { hashPassword } from '@/lib/company-auth';

async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyAccessToken(authHeader.slice(7));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const users = await prisma.companyUser.findMany({
      where: { companyId: BigInt(id) },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id.toString(),
        companyId: u.companyId.toString(),
        email: u.email,
        username: u.username,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        lastLogin: u.lastLogin?.toISOString() || null,
      })),
      total: users.length,
    });
  } catch (error) {
    console.error('Get company users error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { email, username, password, role, isActive } = await request.json();

    if (!email || !username || !password) {
      return NextResponse.json(
        { detail: 'Email, username, and password are required' },
        { status: 400 }
      );
    }

    // Check company exists
    const company = await prisma.company.findUnique({ where: { id: BigInt(id) } });
    if (!company) {
      return NextResponse.json({ detail: 'Company not found' }, { status: 404 });
    }

    // Check duplicate email within company
    const existing = await prisma.companyUser.findUnique({
      where: { companyId_email: { companyId: BigInt(id), email } },
    });
    if (existing) {
      return NextResponse.json(
        { detail: 'A user with this email already exists in this company' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.companyUser.create({
      data: {
        companyId: BigInt(id),
        email,
        username,
        password: hashedPassword,
        role: role || 'member',
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(
      {
        id: user.id.toString(),
        companyId: user.companyId.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastLogin: null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create company user error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
