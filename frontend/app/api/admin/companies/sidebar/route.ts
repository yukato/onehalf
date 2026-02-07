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
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      include: {
        moduleAssignments: {
          where: { isActive: true, module: { isActive: true } },
          include: { module: true },
          orderBy: { module: { sortOrder: 'asc' } },
        },
      },
    });

    return NextResponse.json({
      companies: companies.map((c) => ({
        id: c.id.toString(),
        name: c.name,
        slug: c.slug,
        modules: c.moduleAssignments.map((a) => ({
          id: a.module.id.toString(),
          name: a.module.name,
          slug: a.module.slug,
          icon: a.module.icon,
          sortOrder: a.module.sortOrder,
        })),
      })),
    });
  } catch (error) {
    console.error('Get sidebar companies error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
