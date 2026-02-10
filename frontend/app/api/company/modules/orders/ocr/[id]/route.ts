import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { getOcrExtraction, updateOcrExtraction } from '@/lib/ocr/queries';

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
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const extraction = await getOcrExtraction(payload.companySlug, id);
    if (!extraction) {
      return NextResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(extraction);
  } catch (error) {
    console.error('Get OCR extraction error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getOcrExtraction(payload.companySlug, id);
    if (!existing) {
      return NextResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    await updateOcrExtraction(payload.companySlug, id, {
      extractedData: body.extractedData,
      matchedCustomerId: body.matchedCustomerId,
      matchedCustomerName: body.matchedCustomerName,
      matchConfidence: body.matchConfidence,
      status: body.status || 'reviewed',
    });

    const updated = await getOcrExtraction(payload.companySlug, id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update OCR extraction error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
