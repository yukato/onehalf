import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listTags, createTag } from '@/lib/documents/queries';

async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyAccessToken(authHeader.slice(7));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { companySlug } = await params;
    const company = await prisma.company.findUnique({ where: { slug: companySlug } });
    if (!company) {
      return NextResponse.json({ detail: 'Company not found' }, { status: 404 });
    }

    const tags = await listTags(companySlug);
    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Admin list tags error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { companySlug } = await params;
    const company = await prisma.company.findUnique({ where: { slug: companySlug } });
    if (!company) {
      return NextResponse.json({ detail: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();
    if (!body.name || !body.slug) {
      return NextResponse.json({ detail: 'name and slug are required' }, { status: 400 });
    }

    const id = await createTag(companySlug, {
      name: body.name,
      slug: body.slug,
      color: body.color,
    });

    const tags = await listTags(companySlug);
    const created = tags.find((t) => t.id === id);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Admin create tag error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
