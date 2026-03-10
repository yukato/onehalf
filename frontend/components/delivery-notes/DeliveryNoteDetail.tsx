'use client';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/components/ui/AmountDisplay';
import type { DeliveryNote, DeliveryNoteStatus } from '@/types';

const NEXT_STATUS: Partial<Record<DeliveryNoteStatus, { status: DeliveryNoteStatus; label: string }>> = {
  draft: { status: 'issued', label: '発行済にする' },
  issued: { status: 'delivered', label: '納品済にする' },
  delivered: { status: 'confirmed', label: '確認済にする' },
};

interface DeliveryNoteDetailProps {
  deliveryNote: DeliveryNote;
  onClose: () => void;
  onShare: () => void;
  onStatusChange: (status: string) => void;
}

export function DeliveryNoteDetail({ deliveryNote, onClose, onShare, onStatusChange }: DeliveryNoteDetailProps) {
  const nextStatus = NEXT_STATUS[deliveryNote.status as DeliveryNoteStatus];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-10" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">納品書詳細</h3>
            <StatusBadge status={deliveryNote.status} size="md" />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 bg-gray-50">
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            共有リンク
          </button>
          {nextStatus && (
            <button
              onClick={() => onStatusChange(nextStatus.status)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {nextStatus.label}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">納品番号</span>
              <p className="font-mono font-medium text-gray-900">{deliveryNote.deliveryNumber}</p>
            </div>
            <div>
              <span className="text-gray-500">受注番号</span>
              <p className="font-mono font-medium text-gray-900">{deliveryNote.order.orderNumber}</p>
            </div>
            <div>
              <span className="text-gray-500">取引先</span>
              <p className="font-medium text-gray-900">{deliveryNote.customer.name}</p>
            </div>
            <div>
              <span className="text-gray-500">作成者</span>
              <p className="text-gray-900">{deliveryNote.createdByName}</p>
            </div>
            <div>
              <span className="text-gray-500">納品日</span>
              <p className="text-gray-900">{deliveryNote.deliveryDate}</p>
            </div>
            <div>
              <span className="text-gray-500">売上番号</span>
              <p className="font-mono text-gray-900">{deliveryNote.order.salesNumber || '—'}</p>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliveryNote.items.map((item, index) => (
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
                <span className="text-gray-900">{formatCurrency(deliveryNote.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">消費税</span>
                <span className="text-gray-900">{formatCurrency(deliveryNote.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold text-base">
                <span className="text-gray-700">合計</span>
                <span className="text-gray-900">{formatCurrency(deliveryNote.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {deliveryNote.notes && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">備考</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{deliveryNote.notes}</p>
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
}
