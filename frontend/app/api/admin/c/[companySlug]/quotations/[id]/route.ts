import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { getQuotation, deleteQuotation } from '@/lib/quotations/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const quotation = await getQuotation(auth.companySlug, id);
    if (!quotation) return NextResponse.json({ detail: 'Not found' }, { status: 404 });

    return NextResponse.json(quotation);
  } catch (error) {
    console.error('Get quotation error:', error);
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
    await deleteQuotation(auth.companySlug, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete quotation error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
