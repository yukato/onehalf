'use client';

import { formatCurrency } from '@/components/ui/AmountDisplay';
import type { TopCustomer, TopProduct } from '@/types';

interface RankingTablesProps {
  customers: TopCustomer[];
  products: TopProduct[];
}

function getRankColor(rank: number): string {
  switch (rank) {
    case 1:
      return 'text-yellow-500'; // gold
    case 2:
      return 'text-gray-400'; // silver
    case 3:
      return 'text-amber-600'; // bronze
    default:
      return 'text-gray-300';
  }
}

function getRankBg(rank: number): string {
  switch (rank) {
    case 1:
      return 'bg-yellow-50';
    case 2:
      return 'bg-gray-50';
    case 3:
      return 'bg-amber-50';
    default:
      return '';
  }
}

export function RankingTables({ customers, products }: RankingTablesProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* 取引先ランキング */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-dark">取引先ランキング</h3>
        </div>
        {customers.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-gray-400">
            データがありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-5 py-2.5 font-medium">#</th>
                  <th className="px-3 py-2.5 font-medium">取引先</th>
                  <th className="px-3 py-2.5 font-medium">コード</th>
                  <th className="px-3 py-2.5 text-right font-medium">売上</th>
                  <th className="px-5 py-2.5 text-right font-medium">件数</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => {
                  const rank = i + 1;
                  return (
                    <tr key={c.customerId} className={`border-b border-gray-50 ${getRankBg(rank)}`}>
                      <td className="px-5 py-3">
                        <span className={`text-sm font-bold ${getRankColor(rank)}`}>#{rank}</span>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-dark">{c.customerName}</td>
                      <td className="px-3 py-3 text-xs text-gray-400">{c.customerCode}</td>
                      <td className="px-3 py-3 text-right text-sm font-medium text-slate-dark">
                        {formatCurrency(c.totalSales)}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-500">{c.orderCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 商品ランキング */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-dark">商品ランキング</h3>
        </div>
        {products.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-gray-400">
            データがありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-5 py-2.5 font-medium">#</th>
                  <th className="px-3 py-2.5 font-medium">商品名</th>
                  <th className="px-3 py-2.5 font-medium">コード</th>
                  <th className="px-3 py-2.5 text-right font-medium">金額</th>
                  <th className="px-5 py-2.5 text-right font-medium">数量</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => {
                  const rank = i + 1;
                  return (
                    <tr key={`${p.productCode}-${i}`} className={`border-b border-gray-50 ${getRankBg(rank)}`}>
                      <td className="px-5 py-3">
                        <span className={`text-sm font-bold ${getRankColor(rank)}`}>#{rank}</span>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-dark">{p.productName}</td>
                      <td className="px-3 py-3 text-xs text-gray-400">{p.productCode}</td>
                      <td className="px-3 py-3 text-right text-sm font-medium text-slate-dark">
                        {formatCurrency(p.totalAmount)}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-500">
                        {new Intl.NumberFormat('ja-JP').format(p.totalQuantity)}
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
