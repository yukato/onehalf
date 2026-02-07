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
    const companyId = BigInt(id);

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ detail: 'Company not found' }, { status: 404 });
    }

    const allModules = await prisma.companyModule.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const assignments = await prisma.companyModuleAssignment.findMany({
      where: { companyId },
    });

    const assignmentMap = new Map(
      assignments.map((a) => [a.moduleId.toString(), a])
    );

    return NextResponse.json({
      modules: allModules.map((m) => {
        const assignment = assignmentMap.get(m.id.toString());
        return {
          id: m.id.toString(),
          name: m.name,
          slug: m.slug,
          description: m.description,
          icon: m.icon,
          sortOrder: m.sortOrder,
          isActive: m.isActive,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
          assigned: !!assignment,
          assignmentIsActive: assignment?.isActive ?? false,
          config: assignment?.config ?? null,
        };
      }),
    });
  } catch (error) {
    console.error('Get company modules error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

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
    const companyId = BigInt(id);

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ detail: 'Company not found' }, { status: 404 });
    }

    const { assignments } = await request.json();

    if (!Array.isArray(assignments)) {
      return NextResponse.json({ detail: 'assignments array is required' }, { status: 400 });
    }

    for (const assignment of assignments) {
      const moduleId = BigInt(assignment.moduleId);
      if (assignment.isActive) {
        await prisma.companyModuleAssignment.upsert({
          where: { companyId_moduleId: { companyId, moduleId } },
          create: { companyId, moduleId, isActive: true },
          update: { isActive: true },
        });
      } else {
        await prisma.companyModuleAssignment.deleteMany({
          where: { companyId, moduleId },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update company modules error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
