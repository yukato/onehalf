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

    const modules = await prisma.companyModule.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { assignments: true } } },
    });

    return NextResponse.json({
      modules: modules.map((m) => ({
        id: m.id.toString(),
        name: m.name,
        slug: m.slug,
        description: m.description,
        icon: m.icon,
        sortOrder: m.sortOrder,
        isActive: m.isActive,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
        assignmentCount: m._count.assignments,
      })),
      total: modules.length,
    });
  } catch (error) {
    console.error('Get modules error:', error);
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

    const { name, slug, description, icon, sortOrder } = await request.json();

    if (!name || !slug) {
      return NextResponse.json({ detail: 'Name and slug are required' }, { status: 400 });
    }

    if (!SLUG_REGEX.test(slug)) {
      return NextResponse.json(
        { detail: 'Slug must be lowercase alphanumeric with hyphens (e.g., my-module)' },
        { status: 400 }
      );
    }

    const existing = await prisma.companyModule.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ detail: 'A module with this slug already exists' }, { status: 409 });
    }

    const mod = await prisma.companyModule.create({
      data: {
        name,
        slug,
        description: description || null,
        icon: icon || 'document',
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json(
      {
        id: mod.id.toString(),
        name: mod.name,
        slug: mod.slug,
        description: mod.description,
        icon: mod.icon,
        sortOrder: mod.sortOrder,
        isActive: mod.isActive,
        createdAt: mod.createdAt.toISOString(),
        updatedAt: mod.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create module error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
