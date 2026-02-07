import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';

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
    const company = await prisma.company.findUnique({
      where: { id: BigInt(id) },
      include: { _count: { select: { users: true } } },
    });

    if (!company) {
      return NextResponse.json({ detail: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: company.id.toString(),
      name: company.name,
      slug: company.slug,
      isActive: company.isActive,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
      userCount: company._count.users,
    });
  } catch (error) {
    console.error('Get company error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, slug, isActive } = await request.json();

    if (slug !== undefined && !SLUG_REGEX.test(slug)) {
      return NextResponse.json(
        { detail: 'Slug must be lowercase alphanumeric with hyphens' },
        { status: 400 }
      );
    }

    if (slug) {
      const existing = await prisma.company.findFirst({
        where: { slug, NOT: { id: BigInt(id) } },
      });
      if (existing) {
        return NextResponse.json({ detail: 'A company with this slug already exists' }, { status: 409 });
      }
    }

    const company = await prisma.company.update({
      where: { id: BigInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      id: company.id.toString(),
      name: company.name,
      slug: company.slug,
      isActive: company.isActive,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Update company error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.company.delete({ where: { id: BigInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete company error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
