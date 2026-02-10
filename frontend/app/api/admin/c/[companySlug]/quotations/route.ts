import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { listQuotations, insertQuotation, getQuotation } from '@/lib/quotations/queries';
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

    const result = await listQuotations(auth.companySlug, { customerId, status, q, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error('List quotations error:', error);
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
    if (!body.customerId || !body.quotationDate || !body.items?.length) {
      return NextResponse.json({ detail: 'customerId, quotationDate, and items are required' }, { status: 400 });
    }

    const admin = await prisma.adminUser.findUnique({ where: { id: BigInt(auth.adminId) } });
    const createdByName = admin?.username || 'Admin';

    const id = await insertQuotation(auth.companySlug, {
      customerId: body.customerId,
      subject: body.subject,
      quotationDate: body.quotationDate,
      validUntil: body.validUntil,
      notes: body.notes,
      internalMemo: body.internalMemo,
      items: body.items,
      createdBy: auth.adminId,
      createdByName,
    });

    const quotation = await getQuotation(auth.companySlug, id);
    return NextResponse.json(quotation, { status: 201 });
  } catch (error) {
    console.error('Create quotation error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
