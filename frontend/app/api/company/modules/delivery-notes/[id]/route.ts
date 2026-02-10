import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { getDeliveryNote, deleteDeliveryNote } from '@/lib/delivery-notes/queries';

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
    const deliveryNote = await getDeliveryNote(payload.companySlug, id);
    if (!deliveryNote) return NextResponse.json({ detail: 'Not found' }, { status: 404 });

    return NextResponse.json(deliveryNote);
  } catch (error) {
    console.error('Get delivery note error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await deleteDeliveryNote(payload.companySlug, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete delivery note error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
