import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { addPayment } from '@/lib/invoices/queries';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const body = await request.json();

    if (!body.paymentDate || !body.amount) {
      return NextResponse.json({ detail: 'paymentDate and amount are required' }, { status: 400 });
    }

    const adminUser = await prisma.adminUser.findUnique({ where: { id: BigInt(auth.adminId) } });
    const createdByName = adminUser?.username || 'Admin';

    await addPayment(auth.companySlug, id, {
      paymentDate: body.paymentDate,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      reference: body.reference,
      notes: body.notes,
      createdBy: auth.adminId,
      createdByName,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Admin add payment error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
