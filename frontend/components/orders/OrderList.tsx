'use client';

import { useState } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/components/ui/AmountDisplay';
import { ORDER_TYPE_LABELS } from '@/types';
import type { Order, OrderStatus, OrderType } from '@/types';

const ORDER_TYPE_COLORS: Record<OrderType, string> = {
  general: 'bg-gray-100 text-gray-600',
  repair: 'bg-blue-100 text-blue-700',
  machine: 'bg-green-100 text-green-700',
  small_item: 'bg-orange-100 text-orange-700',
};

interface OrderListProps {
  orders: Omit<Order, 'items'>[];
  total: number;
  offset: number;
  limit: number;
  onPageChange: (offset: number) => void;
  onEdit: (order: Omit<Order, 'items'>) => void;
  onDelete: (id: string) => void;
  onShare: (order: Omit<Order, 'items'>) => void;
  onStatusChange: (id: string, status: string) => void;
}

const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  pending: { status: 'confirmed', label: '確定にする' },
  confirmed: { status: 'in_production', label: '製造中にする' },
  in_production: { status: 'ready', label: '出荷準備完了にする' },
  ready: { status: 'delivered', label: '納品済にする' },
  delivered: { status: 'completed', label: '完了にする' },
};

export function OrderList({
  orders,
  total,
  offset,
  limit,
  onPageChange,
  onEdit,
  onDelete,
  onShare,
  onStatusChange,
}: OrderListProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm text-gray-500">受注がまだありません</p>
        <p className="text-xs text-gray-400 mt-1">見積書の「受注に変換」から受注を作成できます</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">受注番号</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">種別</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">売上番号</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">取引先名</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">受注日</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">納品予定日</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">合計金額</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ステータス</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((o) => {
            const nextStatus = NEXT_STATUS[o.status as OrderStatus];
            return (
              <tr
                key={o.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onEdit(o)}
              >
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">{o.orderNumber}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${ORDER_TYPE_COLORS[o.orderType as OrderType] || ORDER_TYPE_COLORS.general}`}>
                    {ORDER_TYPE_LABELS[o.orderType as OrderType] || o.orderType}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">{o.salesNumber || '—'}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{o.customer.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{o.orderDate}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{o.deliveryDate || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(o.totalAmount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-4 py-3 text-right relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === o.id ? null : o.id); }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                  {menuOpenId === o.id && (
                    <div className="absolute right-4 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-48">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onShare(o); }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        共有リンク
                      </button>
                      {nextStatus && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onStatusChange(o.id, nextStatus.status); }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {nextStatus.label}
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onDelete(o.id); }}
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
