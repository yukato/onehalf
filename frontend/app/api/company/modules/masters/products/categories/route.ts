import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { listProductCategories, createProductCategory } from '@/lib/masters/queries';

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

    const categories = await listProductCategories(payload.companySlug);
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('List product categories error:', error);
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

    const id = await createProductCategory(payload.companySlug, {
      name: body.name,
      slug: body.slug,
      sortOrder: body.sortOrder,
    });

    return NextResponse.json({ id, name: body.name, slug: body.slug }, { status: 201 });
  } catch (error) {
    console.error('Create product category error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
