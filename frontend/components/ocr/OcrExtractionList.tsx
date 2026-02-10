'use client';

import type { OcrExtraction } from '@/types';

interface OcrExtractionListProps {
  extractions: OcrExtraction[];
  total: number;
  offset: number;
  limit: number;
  onPageChange: (offset: number) => void;
  onSelect: (extraction: OcrExtraction) => void;
}

const STATUS_LABELS: Record<OcrExtraction['status'], { label: string; color: string }> = {
  pending: { label: '待機中', color: 'bg-gray-100 text-gray-700' },
  extracting: { label: '抽出中', color: 'bg-blue-100 text-blue-700' },
  extracted: { label: '抽出完了', color: 'bg-yellow-100 text-yellow-800' },
  reviewed: { label: '確認済', color: 'bg-green-100 text-green-700' },
  converted: { label: '受注変換済', color: 'bg-purple-100 text-purple-700' },
  error: { label: 'エラー', color: 'bg-red-100 text-red-700' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function OcrExtractionList({
  extractions,
  total,
  offset,
  limit,
  onPageChange,
  onSelect,
}: OcrExtractionListProps) {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (extractions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm text-gray-500">OCR結果がまだありません</p>
        <p className="text-xs text-gray-400 mt-1">上のパネルから注文書の画像をアップロードしてください</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">画像</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">種別</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">取引先</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品数</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日時</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {extractions.map((ext) => {
              const statusInfo = STATUS_LABELS[ext.status];
              const itemCount = ext.extractedData?.items?.length ?? 0;
              const sourceLabels = { fax: 'FAX', email: 'メール', upload: 'アップロード' };

              return (
                <tr
                  key={ext.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelect(ext)}
                >
                  <td className="px-4 py-3">
                    <div className="w-12 h-12 rounded border border-gray-200 overflow-hidden bg-gray-50 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ext.sourceImageUrl}
                        alt="注文書"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {sourceLabels[ext.sourceType]}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {ext.matchedCustomerName ? (
                      <div>
                        <div className="text-gray-900">{ext.matchedCustomerName}</div>
                        {ext.matchConfidence !== null && (
                          <div className="text-xs text-gray-400">
                            一致度: {Math.round(ext.matchConfidence * 100)}%
                          </div>
                        )}
                      </div>
                    ) : ext.extractedData?.customerName ? (
                      <div className="text-gray-500">
                        {ext.extractedData.customerName}
                        <div className="text-xs text-orange-500">未マッチング</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {itemCount > 0 ? `${itemCount}件` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}>
                      {ext.status === 'extracting' && (
                        <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-1" />
                      )}
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatDate(ext.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(ext);
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      詳細
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <span className="text-xs text-gray-500">
            全{total}件中 {offset + 1}-{Math.min(offset + limit, total)}件
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              disabled={currentPage <= 1}
              className="px-3 py-1 text-xs border rounded disabled:opacity-50"
            >
              前へ
            </button>
            <button
              onClick={() => onPageChange(offset + limit)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 text-xs border rounded disabled:opacity-50"
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
