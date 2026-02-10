import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { updateInvoiceStatus } from '@/lib/invoices/queries';

async function authenticateCompany(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyCompanyAccessToken(authHeader.slice(7));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    if (!body.status) {
      return NextResponse.json({ detail: 'status is required' }, { status: 400 });
    }

    await updateInvoiceStatus(payload.companySlug, id, body.status);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update invoice status error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
