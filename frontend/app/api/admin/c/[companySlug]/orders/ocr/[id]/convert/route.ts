import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { getOcrExtraction, convertOcrToOrder } from '@/lib/ocr/queries';
import { prisma } from '@/lib/prisma';

export async function POST(
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

    if (extraction.status === 'converted') {
      return NextResponse.json({ detail: 'Already converted to order' }, { status: 400 });
    }

    if (!extraction.extractedData || !extraction.matchedCustomerId) {
      return NextResponse.json({ detail: '取引先が未マッチングです。確認してから変換してください。' }, { status: 400 });
    }

    if (!extraction.extractedData.items || extraction.extractedData.items.length === 0) {
      return NextResponse.json({ detail: '商品が抽出されていません。' }, { status: 400 });
    }

    // Get admin user name
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: BigInt(auth.adminId) },
    });
    const userName = adminUser?.username || 'Admin';

    const result = await convertOcrToOrder(auth.companySlug, id, {
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
      createdBy: auth.adminId,
      createdByName: userName,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Admin convert OCR to order error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
