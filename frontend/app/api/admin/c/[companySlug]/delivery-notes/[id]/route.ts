import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { getDeliveryNote, deleteDeliveryNote } from '@/lib/delivery-notes/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const deliveryNote = await getDeliveryNote(auth.companySlug, id);
    if (!deliveryNote) return NextResponse.json({ detail: 'Not found' }, { status: 404 });

    return NextResponse.json(deliveryNote);
  } catch (error) {
    console.error('Admin get delivery note error:', error);
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
    await deleteDeliveryNote(auth.companySlug, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete delivery note error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
