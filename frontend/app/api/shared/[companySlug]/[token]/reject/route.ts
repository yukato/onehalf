import { NextRequest, NextResponse } from 'next/server';
import { rejectSharedLink, getSharedLinkByToken } from '@/lib/shared/queries';

export async function POST(
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

    const result = await rejectSharedLink(companySlug, token, {
      actorName,
      comment,
      ipAddress,
      userAgent,
    });

    if (!result) {
      return NextResponse.json({ detail: '差戻し処理に失敗しました。' }, { status: 500 });
    }

    // Update the target document status
    switch (link.linkType) {
      case 'quotation': {
        const { updateQuotationStatus } = await import('@/lib/quotations/queries');
        await updateQuotationStatus(companySlug, link.targetId, 'rejected');
        break;
      }
      // More types to be added in later phases
    }

    return NextResponse.json({ success: true, message: '差戻しが完了しました。' });
  } catch (error) {
    console.error('Reject shared link error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
