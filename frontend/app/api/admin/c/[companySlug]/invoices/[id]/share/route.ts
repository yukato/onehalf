import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { createSharedLink, listSharedLinks } from '@/lib/shared/queries';
import { updateInvoiceStatus } from '@/lib/invoices/queries';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const links = await listSharedLinks(auth.companySlug, 'invoice', id);
    return NextResponse.json({ links });
  } catch (error) {
    console.error('Admin list shared links error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const adminUser = await prisma.adminUser.findUnique({ where: { id: BigInt(auth.adminId) } });
    const createdByName = adminUser?.username || 'Admin';

    const link = await createSharedLink(auth.companySlug, {
      linkType: 'invoice',
      targetId: id,
      canApprove: body.canApprove !== false,
      expiresInDays: body.expiresInDays || 30,
      createdBy: auth.adminId,
      createdByName,
    });

    // Update invoice status to 'sent'
    await updateInvoiceStatus(auth.companySlug, id, 'sent');

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`;
    const url = `${baseUrl}/shared/${auth.companySlug}/${link.token}`;

    return NextResponse.json({ link, url }, { status: 201 });
  } catch (error) {
    console.error('Admin create shared link error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
