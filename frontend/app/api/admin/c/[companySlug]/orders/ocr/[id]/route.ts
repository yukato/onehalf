import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { getOcrExtraction, updateOcrExtraction } from '@/lib/ocr/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const extraction = await getOcrExtraction(auth.companySlug, id);
    if (!extraction) {
      return NextResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(extraction);
  } catch (error) {
    console.error('Admin get OCR extraction error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const existing = await getOcrExtraction(auth.companySlug, id);
    if (!existing) {
      return NextResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    await updateOcrExtraction(auth.companySlug, id, {
      extractedData: body.extractedData,
      matchedCustomerId: body.matchedCustomerId,
      matchedCustomerName: body.matchedCustomerName,
      matchConfidence: body.matchConfidence,
      status: body.status || 'reviewed',
    });

    const updated = await getOcrExtraction(auth.companySlug, id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Admin update OCR extraction error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
