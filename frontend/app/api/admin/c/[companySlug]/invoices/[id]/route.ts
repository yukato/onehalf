import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { getInvoice, deleteInvoice } from '@/lib/invoices/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const invoice = await getInvoice(auth.companySlug, id);
    if (!invoice) return NextResponse.json({ detail: 'Not found' }, { status: 404 });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Admin get invoice error:', error);
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
    await deleteInvoice(auth.companySlug, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete invoice error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
