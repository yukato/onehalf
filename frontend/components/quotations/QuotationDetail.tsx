'use client';

import React, { useState } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/components/ui/AmountDisplay';
import type { Quotation, QuotationStatus } from '@/types';

const NEXT_STATUS: Partial<Record<QuotationStatus, { status: QuotationStatus; label: string }>> = {
  sent: { status: 'approved', label: '承認済にする' },
};

interface QuotationDetailProps {
  quotation: Quotation;
  onClose: () => void;
  onEdit?: () => void;
  onShare: () => void;
  onConvert: () => void;
  onPdf: () => void | Promise<void>;
  onStatusChange?: (id: string, status: string) => void;
}

export const QuotationDetail = React.memo(function QuotationDetail({ quotation, onClose, onEdit, onShare, onConvert, onPdf, onStatusChange }: QuotationDetailProps) {
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const nextStatus = NEXT_STATUS[quotation.status as QuotationStatus];

  const handlePdf = async () => {
    setIsPdfGenerating(true);
    try {
      await onPdf();
    } finally {
      setIsPdfGenerating(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-10" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">見積書詳細</h3>
            <StatusBadge status={quotation.status} size="md" />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 bg-gray-50">
          {onEdit && quotation.status === 'draft' && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              編集
            </button>
          )}
          <button
            onClick={handlePdf}
            disabled={isPdfGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPdfGenerating ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            {isPdfGenerating ? 'PDF生成中...' : 'PDF出力'}
          </button>
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            共有リンク
          </button>
          {nextStatus && onStatusChange && (
            <button
              onClick={() => onStatusChange(quotation.id, nextStatus.status)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {nextStatus.label}
            </button>
          )}
          {quotation.status === 'approved' && (
            <button
              onClick={onConvert}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              受注に変換
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">見積番号</span>
              <p className="font-mono font-medium text-gray-900">{quotation.quotationNumber}</p>
            </div>
            <div>
              <span className="text-gray-500">取引先</span>
              <p className="font-medium text-gray-900">{quotation.customer.name}</p>
            </div>
            <div>
              <span className="text-gray-500">件名</span>
              <p className="text-gray-900">{quotation.subject || '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">作成者</span>
              <p className="text-gray-900">{quotation.createdByName}</p>
            </div>
            <div>
              <span className="text-gray-500">見積日</span>
              <p className="text-gray-900">{quotation.quotationDate}</p>
            </div>
            <div>
              <span className="text-gray-500">有効期限</span>
              <p className="text-gray-900">{quotation.validUntil || '—'}</p>
            </div>
          </div>

          {/* Items table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">#</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">商品名</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">数量</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">単位</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">単価</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">金額</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">備考</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotation.items.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 1 ? 'bg-gray-50/50' : ''}>
                    <td className="px-4 py-2 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {item.productName}
                      {item.productCode && (
                        <span className="ml-2 text-xs text-gray-400 font-mono">{item.productCode}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{item.unit}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">{formatCurrency(item.amount)}</td>
                    <td className="px-4 py-2 text-xs text-gray-500 max-w-[200px] truncate">{item.notes || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">小計</span>
                <span className="text-gray-900">{formatCurrency(quotation.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">消費税</span>
                <span className="text-gray-900">{formatCurrency(quotation.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold text-base">
                <span className="text-gray-700">合計</span>
                <span className="text-gray-900">{formatCurrency(quotation.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quotation.notes && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">備考</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{quotation.notes}</p>
            </div>
          )}

          {quotation.internalMemo && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">社内メモ</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-yellow-50 border border-yellow-100 p-3 rounded-lg">{quotation.internalMemo}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
});
