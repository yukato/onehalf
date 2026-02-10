import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { listOrders, insertOrder, getOrder } from '@/lib/orders/queries';
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
    const orderType = searchParams.get('orderType') || undefined;
    const q = searchParams.get('q') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await listOrders(auth.companySlug, { customerId, status, orderType, q, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin list orders error:', error);
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
    if (!body.customerId || !body.orderDate || !body.items?.length) {
      return NextResponse.json({ detail: 'customerId, orderDate, and items are required' }, { status: 400 });
    }

    const adminUser = await prisma.adminUser.findUnique({ where: { id: BigInt(auth.adminId) } });
    const createdByName = adminUser?.username || 'Admin';

    const id = await insertOrder(auth.companySlug, {
      customerId: body.customerId,
      quotationId: body.quotationId,
      orderDate: body.orderDate,
      deliveryDate: body.deliveryDate,
      notes: body.notes,
      internalMemo: body.internalMemo,
      orderType: body.orderType,
      customFields: body.customFields,
      items: body.items,
      createdBy: auth.adminId,
      createdByName,
    });

    const order = await getOrder(auth.companySlug, id);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Admin create order error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
