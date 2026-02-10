import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { listInvoices, createInvoiceFromDeliveryNotes, getInvoice } from '@/lib/invoices/queries';
import { prisma } from '@/lib/prisma';

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

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId') || undefined;
    const status = searchParams.get('status') || undefined;
    const q = searchParams.get('q') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await listInvoices(payload.companySlug, { customerId, status, q, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error('List invoices error:', error);
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
    if (!body.customerId || !body.deliveryNoteIds?.length || !body.invoiceDate || !body.dueDate) {
      return NextResponse.json({ detail: 'customerId, deliveryNoteIds, invoiceDate, and dueDate are required' }, { status: 400 });
    }

    const user = await prisma.companyUser.findUnique({ where: { id: BigInt(payload.sub) } });
    const createdByName = user?.username || 'Unknown';

    const id = await createInvoiceFromDeliveryNotes(
      payload.companySlug,
      body.customerId,
      body.deliveryNoteIds,
      body.invoiceDate,
      body.dueDate,
      payload.sub,
      createdByName
    );

    const invoice = await getInvoice(payload.companySlug, id);
    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
