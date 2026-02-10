'use client';

import { formatCurrency } from '@/components/ui/AmountDisplay';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { RecentOrder, Receivable } from '@/types';

interface RecentActivityProps {
  orders: RecentOrder[];
  receivables: Receivable[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export function RecentActivity({ orders, receivables }: RecentActivityProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* 最近の受注 */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-dark">最近の受注</h3>
        </div>
        {orders.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-gray-400">
            データがありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-5 py-2.5 font-medium">受注番号</th>
                  <th className="px-3 py-2.5 font-medium">取引先</th>
                  <th className="px-3 py-2.5 text-right font-medium">金額</th>
                  <th className="px-3 py-2.5 font-medium">ステータス</th>
                  <th className="px-5 py-2.5 font-medium">受注日</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-primary">
                      {order.orderNumber}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-dark">{order.customerName}</td>
                    <td className="px-3 py-3 text-right text-sm font-medium text-slate-dark">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {formatDate(order.orderDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 未回収一覧 */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-dark">未回収一覧</h3>
        </div>
        {receivables.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-gray-400">
            未回収の請求はありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-5 py-2.5 font-medium">請求番号</th>
                  <th className="px-3 py-2.5 font-medium">取引先</th>
                  <th className="px-3 py-2.5 text-right font-medium">残高</th>
                  <th className="px-3 py-2.5 font-medium">支払期日</th>
                  <th className="px-5 py-2.5 font-medium">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {receivables.map((r) => {
                  const overdue = isOverdue(r.dueDate);
                  return (
                    <tr key={r.id} className={`border-b border-gray-50 ${overdue ? 'bg-red-50/50' : ''}`}>
                      <td className="px-5 py-3 text-sm font-medium text-primary">
                        {r.invoiceNumber}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-dark">{r.customerName}</td>
                      <td className="px-3 py-3 text-right text-sm font-medium text-red-600">
                        {formatCurrency(r.remainingAmount)}
                      </td>
                      <td className={`px-3 py-3 text-sm ${overdue ? 'font-medium text-red-600' : 'text-gray-500'}`}>
                        {r.dueDate ? formatDate(r.dueDate) : '-'}
                        {overdue && <span className="ml-1 text-xs text-red-500">(超過)</span>}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
