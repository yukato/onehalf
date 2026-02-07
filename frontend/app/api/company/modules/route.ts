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

    const assignments = await prisma.companyModuleAssignment.findMany({
      where: {
        companyId: BigInt(payload.companyId),
        isActive: true,
        module: { isActive: true },
      },
      include: { module: true },
      orderBy: { module: { sortOrder: 'asc' } },
    });

    return NextResponse.json({
      modules: assignments.map((a) => ({
        id: a.id.toString(),
        companyId: a.companyId.toString(),
        moduleId: a.moduleId.toString(),
        module: {
          id: a.module.id.toString(),
          name: a.module.name,
          slug: a.module.slug,
          description: a.module.description,
          icon: a.module.icon,
          sortOrder: a.module.sortOrder,
          isActive: a.module.isActive,
          createdAt: a.module.createdAt.toISOString(),
          updatedAt: a.module.updatedAt.toISOString(),
        },
        isActive: a.isActive,
        config: a.config,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Company get modules error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
