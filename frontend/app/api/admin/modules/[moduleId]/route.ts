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
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { moduleId } = await params;
    const mod = await prisma.companyModule.findUnique({
      where: { id: BigInt(moduleId) },
      include: { _count: { select: { assignments: true } } },
    });

    if (!mod) {
      return NextResponse.json({ detail: 'Module not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: mod.id.toString(),
      name: mod.name,
      slug: mod.slug,
      description: mod.description,
      icon: mod.icon,
      sortOrder: mod.sortOrder,
      isActive: mod.isActive,
      createdAt: mod.createdAt.toISOString(),
      updatedAt: mod.updatedAt.toISOString(),
      assignmentCount: mod._count.assignments,
    });
  } catch (error) {
    console.error('Get module error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { moduleId } = await params;
    const { name, slug, description, icon, sortOrder, isActive } = await request.json();

    if (slug !== undefined && !SLUG_REGEX.test(slug)) {
      return NextResponse.json(
        { detail: 'Slug must be lowercase alphanumeric with hyphens' },
        { status: 400 }
      );
    }

    if (slug) {
      const existing = await prisma.companyModule.findFirst({
        where: { slug, NOT: { id: BigInt(moduleId) } },
      });
      if (existing) {
        return NextResponse.json({ detail: 'A module with this slug already exists' }, { status: 409 });
      }
    }

    const mod = await prisma.companyModule.update({
      where: { id: BigInt(moduleId) },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      id: mod.id.toString(),
      name: mod.name,
      slug: mod.slug,
      description: mod.description,
      icon: mod.icon,
      sortOrder: mod.sortOrder,
      isActive: mod.isActive,
      createdAt: mod.createdAt.toISOString(),
      updatedAt: mod.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Update module error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { moduleId } = await params;
    await prisma.companyModule.delete({ where: { id: BigInt(moduleId) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete module error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
