import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { getOcrExtraction, convertOcrToOrder } from '@/lib/ocr/queries';
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
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const extraction = await getOcrExtraction(payload.companySlug, id);
    if (!extraction) {
      return NextResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    if (extraction.status === 'converted') {
      return NextResponse.json({ detail: 'Already converted to order' }, { status: 400 });
    }

    if (!extraction.extractedData || !extraction.matchedCustomerId) {
      return NextResponse.json({ detail: '取引先が未マッチングです。確認してから変換してください。' }, { status: 400 });
    }

    if (!extraction.extractedData.items || extraction.extractedData.items.length === 0) {
      return NextResponse.json({ detail: '商品が抽出されていません。' }, { status: 400 });
    }

    // Get user name
    const user = await prisma.companyUser.findUnique({
      where: { id: BigInt(payload.sub) },
    });
    const userName = user?.username || 'Unknown';

    const result = await convertOcrToOrder(payload.companySlug, id, {
      customerId: extraction.matchedCustomerId,
      orderDate: extraction.extractedData.orderDate || new Date().toISOString().split('T')[0],
      items: extraction.extractedData.items.map(item => ({
        productId: item.matchedProductId,
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice ?? 0,
      })),
      notes: extraction.extractedData.notes,
      createdBy: payload.sub,
      createdByName: userName,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Convert OCR to order error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
