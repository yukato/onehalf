'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface SharedLinkData {
  link: {
    id: string;
    token: string;
    linkType: string;
    targetId: string;
    canApprove: boolean;
    approvedAt: string | null;
    approvedByName: string | null;
    approvalComment: string | null;
    rejectedAt: string | null;
    rejectedByName: string | null;
    rejectionComment: string | null;
    createdByName: string;
    expiresAt: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  companySlug: string;
}

const linkTypeLabels: Record<string, string> = {
  quotation: '見積書',
  order: '受注書',
  delivery_note: '納品書',
  invoice: '請求書',
  report: 'レポート',
};

export default function SharedDocumentPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;
  const token = params.token as string;

  const [data, setData] = useState<SharedLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Approval form state
  const [actorName, setActorName] = useState('');
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const isMock = process.env.NEXT_PUBLIC_AUTH_MOCK === 'true';

    if (isMock) {
      // モック：localStorageから該当リンクを探す
      const allKeys = Object.keys(localStorage).filter((k) => k.startsWith('mock-shared-links-'));
      let foundLink: SharedLinkData['link'] | null = null;

      for (const key of allKeys) {
        const links = JSON.parse(localStorage.getItem(key) || '[]');
        const match = links.find((l: SharedLinkData['link']) => l.token === token);
        if (match) {
          foundLink = match;
          break;
        }
      }

      if (!foundLink) {
        setError('共有リンクが見つからないか、期限が切れています。');
        setLoading(false);
        return;
      }

      // モックデータを取得
      import('@/lib/mock').then(({ mockQuotations, mockOrders }) => {
        let docData = null;
        if (foundLink!.linkType === 'quotation') {
          docData = mockQuotations.find((q) => q.id === foundLink!.targetId) || null;
        } else if (foundLink!.linkType === 'order') {
          docData = mockOrders.find((o) => o.id === foundLink!.targetId) || null;
        }
        setData({ link: foundLink!, data: docData, companySlug });
        setLoading(false);
      });
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/shared/${companySlug}/${token}`);
        if (!res.ok) {
          const err = await res.json();
          setError(err.detail || 'データの取得に失敗しました。');
          return;
        }
        const result = await res.json();
        setData(result);
      } catch {
        setError('ネットワークエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companySlug, token]);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!actorName.trim()) {
      alert('お名前を入力してください。');
      return;
    }

    const isMock = process.env.NEXT_PUBLIC_AUTH_MOCK === 'true';
    setActionLoading(true);

    if (isMock && data) {
      // モック：localStorageのリンクを更新
      const storageKey = `mock-shared-links-${data.link.linkType}-${data.link.targetId}`;
      const links = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const idx = links.findIndex((l: SharedLinkData['link']) => l.token === token);
      if (idx >= 0) {
        if (action === 'approve') {
          links[idx] = { ...links[idx], approvedAt: new Date().toISOString(), approvedByName: actorName.trim(), approvalComment: comment.trim() || null };
        } else {
          links[idx] = { ...links[idx], rejectedAt: new Date().toISOString(), rejectedByName: actorName.trim(), rejectionComment: comment.trim() || null };
        }
        localStorage.setItem(storageKey, JSON.stringify(links));
        setData({ ...data, link: links[idx] });
        setActionResult({ success: true, message: action === 'approve' ? '承認しました。' : '差戻ししました。' });
      }
      setActionLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/shared/${companySlug}/${token}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorName: actorName.trim(), comment: comment.trim() || undefined }),
      });

      const result = await res.json();
      if (res.ok) {
        setActionResult({ success: true, message: result.message });
        // Reload data to reflect the updated status
        const reloadRes = await fetch(`/api/shared/${companySlug}/${token}`);
        if (reloadRes.ok) {
          setData(await reloadRes.json());
        }
      } else {
        setActionResult({ success: false, message: result.detail || 'エラーが発生しました。' });
      }
    } catch {
      setActionResult({ success: false, message: 'ネットワークエラーが発生しました。' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-4 text-center">
          <div className="text-red-500 text-lg font-medium mb-2">エラー</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { link } = data;
  const isProcessed = !!link.approvedAt || !!link.rejectedAt;
  const isApproved = !!link.approvedAt;
  const docTypeLabel = linkTypeLabels[link.linkType] || '帳票';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{docTypeLabel}</h1>
              <p className="text-sm text-gray-500 mt-0.5">共有リンクからアクセスしています</p>
            </div>
            {isProcessed && (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  isApproved
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {isApproved ? '承認済' : '差戻し'}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
        {/* Document content preview */}
        {data.data && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            {link.linkType === 'quotation' && <QuotationPreview data={data.data} />}
            {link.linkType === 'order' && <OrderPreview data={data.data} />}
            {!['quotation', 'order'].includes(link.linkType) && (
              <div className="text-gray-500 text-center py-8">プレビューは準備中です</div>
            )}
          </div>
        )}

        {/* Approval status display */}
        {isProcessed && (
          <div
            className={`rounded-lg border p-4 mb-6 ${
              isApproved ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="font-medium text-sm">
              {isApproved ? '承認済み' : '差戻し済み'}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {isApproved
                ? `${link.approvedByName}様により承認されました`
                : `${link.rejectedByName}様により差戻しされました`}
            </div>
            {(link.approvalComment || link.rejectionComment) && (
              <div className="text-sm text-gray-600 mt-2 bg-white/50 rounded p-2">
                {link.approvalComment || link.rejectionComment}
              </div>
            )}
          </div>
        )}

        {/* Approval form */}
        {link.canApprove && !isProcessed && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">承認・差戻し</h2>

            {actionResult && (
              <div
                className={`rounded-lg p-3 mb-4 text-sm ${
                  actionResult.success
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {actionResult.message}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  お名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={actorName}
                  onChange={(e) => setActorName(e.target.value)}
                  placeholder="承認者のお名前"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  コメント
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="コメントがあればご記入ください"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleAction('approve')}
                  disabled={actionLoading}
                  className="flex-1 bg-green-600 text-white hover:bg-green-700 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading ? '処理中...' : '承認する'}
                </button>
                <button
                  onClick={() => handleAction('reject')}
                  disabled={actionLoading}
                  className="flex-1 bg-white text-red-600 border border-red-300 hover:bg-red-50 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading ? '処理中...' : '差戻し'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View-only notice */}
        {!link.canApprove && !isProcessed && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
            この帳票は閲覧のみのリンクです。
          </div>
        )}

        {/* Expiry info */}
        <div className="text-xs text-gray-400 text-center mt-6">
          このリンクの有効期限: {new Date(link.expiresAt).toLocaleDateString('ja-JP')}
        </div>
      </main>
    </div>
  );
}

// ---------- Preview Components ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function QuotationPreview({ data }: { data: any }) {
  if (!data) return null;
  const fmt = (n: number) => `¥${new Intl.NumberFormat('ja-JP').format(n)}`;

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-xs text-gray-500 mb-1">見積番号</div>
          <div className="text-lg font-mono font-semibold">{data.quotationNumber}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">見積日</div>
          <div>{data.quotationDate}</div>
          {data.validUntil && (
            <div className="text-xs text-gray-500 mt-1">有効期限: {data.validUntil}</div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-1">宛先</div>
        <div className="font-medium">{data.customer?.name} 様</div>
      </div>

      {data.subject && (
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-1">件名</div>
          <div>{data.subject}</div>
        </div>
      )}

      {data.items && data.items.length > 0 && (
        <table className="w-full text-sm border-collapse mb-4">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 px-2">品名</th>
              <th className="text-right py-2 px-2">数量</th>
              <th className="text-right py-2 px-2">単価</th>
              <th className="text-right py-2 px-2">金額</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {data.items.map((item: any, i: number) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 px-2">{item.productName}</td>
                <td className="text-right py-2 px-2">{item.quantity} {item.unit}</td>
                <td className="text-right py-2 px-2">{fmt(item.unitPrice)}</td>
                <td className="text-right py-2 px-2">{fmt(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="border-t-2 border-gray-200 pt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">小計</span>
          <span>{fmt(data.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">消費税</span>
          <span>{fmt(data.taxAmount)}</span>
        </div>
        <div className="flex justify-between font-semibold text-base pt-1 border-t">
          <span>合計</span>
          <span>{fmt(data.totalAmount)}</span>
        </div>
      </div>

      {data.notes && (
        <div className="mt-4 text-sm text-gray-600 bg-gray-50 rounded p-3">
          <div className="text-xs text-gray-500 mb-1">備考</div>
          {data.notes}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OrderPreview({ data }: { data: any }) {
  if (!data) return null;
  const fmt = (n: number) => `¥${new Intl.NumberFormat('ja-JP').format(n)}`;

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-xs text-gray-500 mb-1">受注番号</div>
          <div className="text-lg font-mono font-semibold">{data.orderNumber}</div>
          {data.salesNumber && (
            <div className="text-xs text-gray-500 mt-1">売上NO: {data.salesNumber}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">受注日</div>
          <div>{data.orderDate}</div>
          {data.deliveryDate && (
            <div className="text-xs text-gray-500 mt-1">納品予定: {data.deliveryDate}</div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-1">取引先</div>
        <div className="font-medium">{data.customer?.name}</div>
      </div>

      {data.items && data.items.length > 0 && (
        <table className="w-full text-sm border-collapse mb-4">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 px-2">品名</th>
              <th className="text-right py-2 px-2">数量</th>
              <th className="text-right py-2 px-2">単価</th>
              <th className="text-right py-2 px-2">金額</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {data.items.map((item: any, i: number) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 px-2">{item.productName}</td>
                <td className="text-right py-2 px-2">{item.quantity} {item.unit}</td>
                <td className="text-right py-2 px-2">{fmt(item.unitPrice)}</td>
                <td className="text-right py-2 px-2">{fmt(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="border-t-2 border-gray-200 pt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">小計</span>
          <span>{fmt(data.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">消費税</span>
          <span>{fmt(data.taxAmount)}</span>
        </div>
        <div className="flex justify-between font-semibold text-base pt-1 border-t">
          <span>合計</span>
          <span>{fmt(data.totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}
