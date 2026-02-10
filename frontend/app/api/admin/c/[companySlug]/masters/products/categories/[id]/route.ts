import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { updateProductCategory, deleteProductCategory } from '@/lib/masters/queries';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const body = await request.json();
    await updateProductCategory(auth.companySlug, id, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update product category error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    await deleteProductCategory(auth.companySlug, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete product category error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
