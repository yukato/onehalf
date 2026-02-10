import { NextRequest, NextResponse } from 'next/server';
import { getSharedLinkByToken } from '@/lib/shared/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; token: string }> }
) {
  try {
    const { companySlug, token } = await params;

    const link = await getSharedLinkByToken(companySlug, token);
    if (!link) {
      return NextResponse.json(
        { detail: 'このリンクは無効か、有効期限が切れています。' },
        { status: 404 }
      );
    }

    // Load the target document based on link type
    let targetData: unknown = null;

    switch (link.linkType) {
      case 'quotation': {
        const { getQuotation } = await import('@/lib/quotations/queries');
        targetData = await getQuotation(companySlug, link.targetId);
        break;
      }
      case 'order': {
        const { getOrder } = await import('@/lib/orders/queries');
        targetData = await getOrder(companySlug, link.targetId);
        break;
      }
      // delivery_note and invoice will be added in later phases
      default:
        targetData = null;
    }

    return NextResponse.json({
      link,
      data: targetData,
      companySlug,
    });
  } catch (error) {
    console.error('Get shared link error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
