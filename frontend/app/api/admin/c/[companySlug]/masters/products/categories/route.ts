import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { listProductCategories, createProductCategory } from '@/lib/masters/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const categories = await listProductCategories(auth.companySlug);
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('List product categories error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    if (!body.name || !body.slug) {
      return NextResponse.json({ detail: 'name and slug are required' }, { status: 400 });
    }

    const id = await createProductCategory(auth.companySlug, {
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
