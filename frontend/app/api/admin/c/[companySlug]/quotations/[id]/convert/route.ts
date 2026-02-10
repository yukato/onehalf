import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { createOrderFromQuotation } from '@/lib/orders/queries';
import { getOrder } from '@/lib/orders/queries';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { id } = await params;

    const admin = await prisma.adminUser.findUnique({ where: { id: BigInt(auth.adminId) } });
    const createdByName = admin?.username || 'Admin';

    const orderId = await createOrderFromQuotation(auth.companySlug, id, auth.adminId, createdByName);
    const order = await getOrder(auth.companySlug, orderId);

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Convert quotation to order error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
