'use client';

import { useState } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/components/ui/AmountDisplay';
import { companyApi } from '@/lib/company-api';
import type { Quotation } from '@/types';

interface QuotationListProps {
  quotations: Omit<Quotation, 'items'>[];
  total: number;
  offset: number;
  limit: number;
  onPageChange: (offset: number) => void;
  onEdit: (quotation: Omit<Quotation, 'items'>) => void;
  onDelete: (id: string) => void;
  onShare: (quotation: Omit<Quotation, 'items'>) => void;
  onConvert: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export function QuotationList({
  quotations,
  total,
  offset,
  limit,
  onPageChange,
  onEdit,
  onDelete,
  onShare,
  onConvert,
  onStatusChange,
}: QuotationListProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (quotations.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-gray-500">見積書がまだありません</p>
        <p className="text-xs text-gray-400 mt-1">「新規作成」から見積書を作成しましょう</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">見積番号</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">取引先名</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">件名</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">見積日</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">合計金額</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ステータス</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {quotations.map((q) => (
            <tr
              key={q.id}
              className="hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onEdit(q)}
            >
              <td className="px-4 py-3 text-sm text-gray-500 font-mono">{q.quotationNumber}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{q.customer.name}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{q.subject || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{q.quotationDate}</td>
              <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(q.totalAmount)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={q.status} />
              </td>
              <td className="px-4 py-3 text-right relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === q.id ? null : q.id); }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {menuOpenId === q.id && (
                  <div className="absolute right-4 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-40">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(null);
                        window.open(companyApi.getQuotationPdfUrl(q.id), '_blank');
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      PDF出力
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onShare(q); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      共有リンク
                    </button>
                    {q.status === 'approved' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onConvert(q.id); }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        受注に変換
                      </button>
                    )}
                    {q.status === 'draft' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onStatusChange(q.id, 'sent'); }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        送付済にする
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onDelete(q.id); }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      削除
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
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
