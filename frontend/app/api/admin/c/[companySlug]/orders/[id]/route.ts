import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { getOrder, deleteOrder } from '@/lib/orders/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const order = await getOrder(auth.companySlug, id);
    if (!order) return NextResponse.json({ detail: 'Not found' }, { status: 404 });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Admin get order error:', error);
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
    await deleteOrder(auth.companySlug, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete order error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
