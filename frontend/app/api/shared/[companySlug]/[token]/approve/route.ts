import { NextRequest, NextResponse } from 'next/server';
import { approveSharedLink, getSharedLinkByToken } from '@/lib/shared/queries';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; token: string }> }
) {
  try {
    const { companySlug, token } = await params;

    // Verify link exists and is valid
    const link = await getSharedLinkByToken(companySlug, token);
    if (!link) {
      return NextResponse.json(
        { detail: 'このリンクは無効か、有効期限が切れています。' },
        { status: 404 }
      );
    }

    if (!link.canApprove) {
      return NextResponse.json(
        { detail: 'このリンクには承認権限がありません。' },
        { status: 403 }
      );
    }

    if (link.approvedAt || link.rejectedAt) {
      return NextResponse.json(
        { detail: 'この帳票は既に処理済みです。' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const actorName = body.actorName || '外部ユーザー';
    const comment = body.comment || null;

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
    const userAgent = request.headers.get('user-agent') || '';

    const result = await approveSharedLink(companySlug, token, {
      actorName,
      comment,
      ipAddress,
      userAgent,
    });

    if (!result) {
      return NextResponse.json({ detail: '承認処理に失敗しました。' }, { status: 500 });
    }

    // Update the target document status based on link type
    switch (link.linkType) {
      case 'quotation': {
        const { updateQuotationStatus } = await import('@/lib/quotations/queries');
        await updateQuotationStatus(companySlug, link.targetId, 'approved');
        break;
      }
      case 'order': {
        const { updateOrderStatus } = await import('@/lib/orders/queries');
        await updateOrderStatus(companySlug, link.targetId, 'confirmed');
        break;
      }
      // More types to be added in later phases
    }

    return NextResponse.json({ success: true, message: '承認が完了しました。' });
  } catch (error) {
    console.error('Approve shared link error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
