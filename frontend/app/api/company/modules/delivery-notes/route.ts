import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { listDeliveryNotes, createDeliveryNoteFromOrder, getDeliveryNote } from '@/lib/delivery-notes/queries';
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
    const orderId = searchParams.get('orderId') || undefined;
    const status = searchParams.get('status') || undefined;
    const q = searchParams.get('q') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await listDeliveryNotes(payload.companySlug, { customerId, orderId, status, q, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error('List delivery notes error:', error);
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
    if (!body.orderId) {
      return NextResponse.json({ detail: 'orderId is required' }, { status: 400 });
    }

    const user = await prisma.companyUser.findUnique({ where: { id: BigInt(payload.sub) } });
    const createdByName = user?.username || 'Unknown';

    const id = await createDeliveryNoteFromOrder(
      payload.companySlug,
      body.orderId,
      payload.sub,
      createdByName,
      body.deliveryDate
    );

    const deliveryNote = await getDeliveryNote(payload.companySlug, id);
    return NextResponse.json(deliveryNote, { status: 201 });
  } catch (error) {
    console.error('Create delivery note error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
