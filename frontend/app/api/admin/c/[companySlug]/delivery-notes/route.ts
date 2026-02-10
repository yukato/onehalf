import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { listDeliveryNotes, createDeliveryNoteFromOrder, getDeliveryNote } from '@/lib/delivery-notes/queries';
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
    const orderId = searchParams.get('orderId') || undefined;
    const status = searchParams.get('status') || undefined;
    const q = searchParams.get('q') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await listDeliveryNotes(auth.companySlug, { customerId, orderId, status, q, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin list delivery notes error:', error);
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
    if (!body.orderId) {
      return NextResponse.json({ detail: 'orderId is required' }, { status: 400 });
    }

    const adminUser = await prisma.adminUser.findUnique({ where: { id: BigInt(auth.adminId) } });
    const createdByName = adminUser?.username || 'Admin';

    const id = await createDeliveryNoteFromOrder(
      auth.companySlug,
      body.orderId,
      auth.adminId,
      createdByName,
      body.deliveryDate
    );

    const deliveryNote = await getDeliveryNote(auth.companySlug, id);
    return NextResponse.json(deliveryNote, { status: 201 });
  } catch (error) {
    console.error('Admin create delivery note error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
