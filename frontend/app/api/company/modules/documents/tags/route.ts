import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { listTags, createTag } from '@/lib/documents/queries';

async function authenticateCompany(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyCompanyAccessToken(authHeader.slice(7));
}

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const tags = await listTags(payload.companySlug);
    return NextResponse.json({ tags });
  } catch (error) {
    console.error('List tags error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.name || !body.slug) {
      return NextResponse.json({ detail: 'name and slug are required' }, { status: 400 });
    }

    const id = await createTag(payload.companySlug, {
      name: body.name,
      slug: body.slug,
      color: body.color,
    });

    const tags = await listTags(payload.companySlug);
    const created = tags.find((t) => t.id === id);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Create tag error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
