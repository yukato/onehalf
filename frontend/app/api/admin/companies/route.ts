import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';

async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyAccessToken(authHeader.slice(7));
}

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true } } },
    });

    return NextResponse.json({
      companies: companies.map((c) => ({
        id: c.id.toString(),
        name: c.name,
        slug: c.slug,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        userCount: c._count.users,
      })),
      total: companies.length,
    });
  } catch (error) {
    console.error('Get companies error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { name, slug, isActive } = await request.json();

    if (!name || !slug) {
      return NextResponse.json({ detail: 'Name and slug are required' }, { status: 400 });
    }

    if (!SLUG_REGEX.test(slug)) {
      return NextResponse.json(
        { detail: 'Slug must be lowercase alphanumeric with hyphens (e.g., my-company)' },
        { status: 400 }
      );
    }

    const existing = await prisma.company.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ detail: 'A company with this slug already exists' }, { status: 409 });
    }

    const company = await prisma.company.create({
      data: {
        name,
        slug,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(
      {
        id: company.id.toString(),
        name: company.name,
        slug: company.slug,
        isActive: company.isActive,
        createdAt: company.createdAt.toISOString(),
        updatedAt: company.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create company error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
