import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateTag, deleteTag } from '@/lib/documents/queries';

async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyAccessToken(authHeader.slice(7));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { companySlug, id } = await params;
    const company = await prisma.company.findUnique({ where: { slug: companySlug } });
    if (!company) {
      return NextResponse.json({ detail: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();
    await updateTag(companySlug, id, {
      name: body.name,
      slug: body.slug,
      color: body.color,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin update tag error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { companySlug, id } = await params;
    const company = await prisma.company.findUnique({ where: { slug: companySlug } });
    if (!company) {
      return NextResponse.json({ detail: 'Company not found' }, { status: 404 });
    }

    await deleteTag(companySlug, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete tag error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
