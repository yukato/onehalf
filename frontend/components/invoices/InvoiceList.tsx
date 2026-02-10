'use client';

import { useState } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/components/ui/AmountDisplay';
import type { Invoice, InvoiceStatus } from '@/types';

interface InvoiceListProps {
  invoices: Omit<Invoice, 'items' | 'payments'>[];
  total: number;
  offset: number;
  limit: number;
  onPageChange: (offset: number) => void;
  onEdit: (invoice: Omit<Invoice, 'items' | 'payments'>) => void;
  onDelete: (id: string) => void;
  onShare: (invoice: Omit<Invoice, 'items' | 'payments'>) => void;
  onStatusChange: (id: string, status: string) => void;
  onAddPayment: (invoice: Omit<Invoice, 'items' | 'payments'>) => void;
}

const NEXT_STATUS: Partial<Record<InvoiceStatus, { status: InvoiceStatus; label: string }>> = {
  draft: { status: 'issued', label: '発行済にする' },
  issued: { status: 'sent', label: '送付済にする' },
};

export function InvoiceList({
  invoices,
  total,
  offset,
  limit,
  onPageChange,
  onEdit,
  onDelete,
  onShare,
  onStatusChange,
  onAddPayment,
}: InvoiceListProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p className="text-sm text-gray-500">請求書がまだありません</p>
        <p className="text-xs text-gray-400 mt-1">「新規作成」から請求書を作成しましょう</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">請求番号</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">取引先名</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">請求日</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">支払期限</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">合計金額</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">入金額</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ステータス</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {invoices.map((inv) => {
            const nextStatus = NEXT_STATUS[inv.status as InvoiceStatus];
            const canAddPayment = ['sent', 'partially_paid', 'overdue'].includes(inv.status);
            return (
              <tr
                key={inv.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onEdit(inv)}
              >
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">{inv.invoiceNumber}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.customer.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{inv.invoiceDate}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{inv.dueDate || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(inv.totalAmount)}</td>
                <td className="px-4 py-3 text-sm text-right">
                  <span className={inv.paidAmount >= inv.totalAmount ? 'text-green-600 font-medium' : 'text-gray-900'}>
                    {formatCurrency(inv.paidAmount)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="px-4 py-3 text-right relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === inv.id ? null : inv.id); }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                  {menuOpenId === inv.id && (
                    <div className="absolute right-4 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-48">
                      {canAddPayment && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onAddPayment(inv); }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          入金登録
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onShare(inv); }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        共有リンク
                      </button>
                      {nextStatus && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onStatusChange(inv.id, nextStatus.status); }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {nextStatus.label}
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onDelete(inv.id); }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        削除
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            {total}件中 {offset + 1}〜{Math.min(offset + limit, total)}件
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              disabled={currentPage <= 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              前へ
            </button>
            <button
              onClick={() => onPageChange(offset + limit)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
