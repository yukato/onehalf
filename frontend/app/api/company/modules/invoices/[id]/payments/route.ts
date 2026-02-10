import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { addPayment } from '@/lib/invoices/queries';
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
    const body = await request.json();

    if (!body.paymentDate || !body.amount) {
      return NextResponse.json({ detail: 'paymentDate and amount are required' }, { status: 400 });
    }

    const user = await prisma.companyUser.findUnique({ where: { id: BigInt(payload.sub) } });
    const createdByName = user?.username || 'Unknown';

    await addPayment(payload.companySlug, id, {
      paymentDate: body.paymentDate,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      reference: body.reference,
      notes: body.notes,
      createdBy: payload.sub,
      createdByName,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Add payment error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
