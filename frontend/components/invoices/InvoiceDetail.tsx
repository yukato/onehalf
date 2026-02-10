'use client';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/components/ui/AmountDisplay';
import type { Invoice, InvoiceStatus } from '@/types';

const NEXT_STATUS: Partial<Record<InvoiceStatus, { status: InvoiceStatus; label: string }>> = {
  draft: { status: 'issued', label: '発行済にする' },
  issued: { status: 'sent', label: '送付済にする' },
};

interface InvoiceDetailProps {
  invoice: Invoice;
  onClose: () => void;
  onShare: () => void;
  onStatusChange: (status: string) => void;
  onAddPayment: () => void;
}

export function InvoiceDetail({ invoice, onClose, onShare, onStatusChange, onAddPayment }: InvoiceDetailProps) {
  const nextStatus = NEXT_STATUS[invoice.status as InvoiceStatus];
  const canAddPayment = ['sent', 'partially_paid', 'overdue'].includes(invoice.status);
  const remaining = invoice.totalAmount - invoice.paidAmount;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">請求書詳細</h3>
            <StatusBadge status={invoice.status} size="md" />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 bg-gray-50">
          {canAddPayment && (
            <button
              onClick={onAddPayment}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              入金登録
            </button>
          )}
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
              <span className="text-gray-500">請求番号</span>
              <p className="font-mono font-medium text-gray-900">{invoice.invoiceNumber}</p>
            </div>
            <div>
              <span className="text-gray-500">取引先</span>
              <p className="font-medium text-gray-900">{invoice.customer.name}</p>
            </div>
            <div>
              <span className="text-gray-500">請求期間</span>
              <p className="text-gray-900">
                {invoice.billingPeriodStart && invoice.billingPeriodEnd
                  ? `${invoice.billingPeriodStart} 〜 ${invoice.billingPeriodEnd}`
                  : '—'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">作成者</span>
              <p className="text-gray-900">{invoice.createdByName}</p>
            </div>
            <div>
              <span className="text-gray-500">請求日</span>
              <p className="text-gray-900">{invoice.invoiceDate}</p>
            </div>
            <div>
              <span className="text-gray-500">支払期限</span>
              <p className="text-gray-900">{invoice.dueDate || '—'}</p>
            </div>
          </div>

          {/* Items table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">#</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">摘要</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">数量</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">単位</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">単価</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">金額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 1 ? 'bg-gray-50/50' : ''}>
                    <td className="px-4 py-2 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
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
                <span className="text-gray-900">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">消費税</span>
                <span className="text-gray-900">{formatCurrency(invoice.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold text-base">
                <span className="text-gray-700">合計</span>
                <span className="text-gray-900">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">入金済</span>
                <span className={invoice.paidAmount >= invoice.totalAmount ? 'text-green-600 font-medium' : 'text-gray-900'}>
                  {formatCurrency(invoice.paidAmount)}
                </span>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">未入金</span>
                  <span className="text-red-600 font-medium">{formatCurrency(remaining)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payments list */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">入金履歴</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">入金日</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">金額</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">方法</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">参照番号</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">登録者</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoice.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">{payment.paymentDate}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">{formatCurrency(payment.amount)}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{payment.paymentMethod || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 font-mono">{payment.reference || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{payment.createdByName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">備考</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{invoice.notes}</p>
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
