import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { createSharedLink, listSharedLinks } from '@/lib/shared/queries';
import { updateOrderStatus } from '@/lib/orders/queries';
import { prisma } from '@/lib/prisma';

async function authenticateCompany(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyCompanyAccessToken(authHeader.slice(7));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const links = await listSharedLinks(payload.companySlug, 'order', id);
    return NextResponse.json({ links });
  } catch (error) {
    console.error('List shared links error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const user = await prisma.companyUser.findUnique({ where: { id: BigInt(payload.sub) } });
    const createdByName = user?.username || 'Unknown';

    const link = await createSharedLink(payload.companySlug, {
      linkType: 'order',
      targetId: id,
      canApprove: body.canApprove !== false,
      expiresInDays: body.expiresInDays || 30,
      createdBy: payload.sub,
      createdByName,
    });

    // Update order status to 'sent'
    await updateOrderStatus(payload.companySlug, id, 'sent');

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`;
    const url = `${baseUrl}/shared/${payload.companySlug}/${link.token}`;

    return NextResponse.json({ link, url }, { status: 201 });
  } catch (error) {
    console.error('Create shared link error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
