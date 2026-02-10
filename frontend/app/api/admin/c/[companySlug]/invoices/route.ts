import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { listInvoices, createInvoiceFromDeliveryNotes, getInvoice } from '@/lib/invoices/queries';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId') || undefined;
    const status = searchParams.get('status') || undefined;
    const q = searchParams.get('q') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await listInvoices(auth.companySlug, { customerId, status, q, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin list invoices error:', error);
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
    if (!body.customerId || !body.deliveryNoteIds?.length || !body.invoiceDate || !body.dueDate) {
      return NextResponse.json({ detail: 'customerId, deliveryNoteIds, invoiceDate, and dueDate are required' }, { status: 400 });
    }

    const adminUser = await prisma.adminUser.findUnique({ where: { id: BigInt(auth.adminId) } });
    const createdByName = adminUser?.username || 'Admin';

    const id = await createInvoiceFromDeliveryNotes(
      auth.companySlug,
      body.customerId,
      body.deliveryNoteIds,
      body.invoiceDate,
      body.dueDate,
      auth.adminId,
      createdByName
    );

    const invoice = await getInvoice(auth.companySlug, id);
    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Admin create invoice error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
