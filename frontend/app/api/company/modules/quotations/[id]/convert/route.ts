import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { createOrderFromQuotation } from '@/lib/orders/queries';
import { getOrder } from '@/lib/orders/queries';
import { prisma } from '@/lib/prisma';

async function authenticateCompany(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyCompanyAccessToken(authHeader.slice(7));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const user = await prisma.companyUser.findUnique({ where: { id: BigInt(payload.sub) } });
    const createdByName = user?.username || 'Unknown';

    const orderId = await createOrderFromQuotation(payload.companySlug, id, payload.sub, createdByName);
    const order = await getOrder(payload.companySlug, orderId);

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Convert quotation to order error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
