import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { createSharedLink, listSharedLinks } from '@/lib/shared/queries';
import { updateQuotationStatus } from '@/lib/quotations/queries';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const links = await listSharedLinks(auth.companySlug, 'quotation', id);
    return NextResponse.json({ links });
  } catch (error) {
    console.error('List shared links error:', error);
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

    const admin = await prisma.adminUser.findUnique({ where: { id: BigInt(auth.adminId) } });
    const createdByName = admin?.username || 'Admin';

    const link = await createSharedLink(auth.companySlug, {
      linkType: 'quotation',
      targetId: id,
      canApprove: body.canApprove !== false,
      expiresInDays: body.expiresInDays || 30,
      createdBy: auth.adminId,
      createdByName,
    });

    // Update quotation status to 'sent'
    await updateQuotationStatus(auth.companySlug, id, 'sent');

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`;
    const url = `${baseUrl}/shared/${auth.companySlug}/${link.token}`;

    return NextResponse.json({ link, url }, { status: 201 });
  } catch (error) {
    console.error('Create shared link error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
