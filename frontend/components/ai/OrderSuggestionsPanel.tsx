'use client';

import { useState, useEffect } from 'react';
import type { OrderSuggestion } from '@/types';

interface OrderSuggestionsPanelProps {
  fetchOrderSuggestions: (customerId: string) => Promise<{ suggestion: OrderSuggestion | null }>;
  customerId: string | null;
  onApplyProduct?: (product: { productId: string; productName: string; quantity: number }) => void;
}

export function OrderSuggestionsPanel({ fetchOrderSuggestions, customerId, onApplyProduct }: OrderSuggestionsPanelProps) {
  const [suggestion, setSuggestion] = useState<OrderSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) {
      setSuggestion(null);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchOrderSuggestions(customerId!);
        if (!cancelled) setSuggestion(data.suggestion);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '提案の取得に失敗しました');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [customerId, fetchOrderSuggestions]);

  if (!customerId) return null;
  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-pulse">
        <div className="h-4 w-32 bg-blue-100 rounded mb-3" />
        <div className="space-y-2">
          <div className="h-3 w-48 bg-blue-100 rounded" />
          <div className="h-3 w-40 bg-blue-100 rounded" />
        </div>
      </div>
    );
  }
  if (error || !suggestion || suggestion.topProducts.length === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
        <h4 className="text-sm font-semibold text-blue-900">
          {suggestion.customerName} の注文パターン
        </h4>
      </div>

      {/* Order interval and last order info */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs text-blue-700">
        {suggestion.lastOrderDate && (
          <span>
            前回注文: {suggestion.lastOrderDate}
          </span>
        )}
        {suggestion.avgOrderInterval !== null && (
          <span>
            平均注文間隔: {suggestion.avgOrderInterval}日
          </span>
        )}
      </div>

      {/* Anomaly warning */}
      {suggestion.anomalyWarning && (
        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
          <span className="font-medium">注意: </span>
          {suggestion.anomalyWarning}
        </div>
      )}

      {/* Top products table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-blue-600 border-b border-blue-200">
              <th className="pb-1.5 font-medium">商品名</th>
              <th className="pb-1.5 font-medium text-right">平均数量</th>
              <th className="pb-1.5 font-medium text-right">注文回数</th>
              <th className="pb-1.5 font-medium text-right">最終注文</th>
              {onApplyProduct && <th className="pb-1.5 font-medium text-right w-16" />}
            </tr>
          </thead>
          <tbody className="text-blue-900">
            {suggestion.topProducts.map((p, i) => (
              <tr key={i} className="border-b border-blue-100 last:border-b-0">
                <td className="py-1.5">{p.productName}</td>
                <td className="py-1.5 text-right">{p.avgQuantity}</td>
                <td className="py-1.5 text-right">{p.frequency}回</td>
                <td className="py-1.5 text-right">{p.lastOrdered}</td>
                {onApplyProduct && (
                  <td className="py-1.5 text-right">
                    <button
                      onClick={() => onApplyProduct({
                        productId: p.productId,
                        productName: p.productName,
                        quantity: p.avgQuantity,
                      })}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      追加
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
