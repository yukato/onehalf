import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { updateInvoiceStatus } from '@/lib/invoices/queries';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const body = await request.json();

    if (!body.status) {
      return NextResponse.json({ detail: 'status is required' }, { status: 400 });
    }

    await updateInvoiceStatus(auth.companySlug, id, body.status);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin update invoice status error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
