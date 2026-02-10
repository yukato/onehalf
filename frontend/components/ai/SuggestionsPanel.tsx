'use client';

import { useState, useEffect } from 'react';
import type { AutoSuggestion } from '@/types';

interface SuggestionsPanelProps {
  fetchSuggestions: () => Promise<{ suggestions: AutoSuggestion[] }>;
  companySlug: string;
  basePath: string; // e.g., '/admin/c/yagichu' or '/company/yagichu'
}

const PRIORITY_COLORS = {
  high: 'bg-red-50 border-red-200 text-red-700',
  medium: 'bg-amber-50 border-amber-200 text-amber-700',
  low: 'bg-blue-50 border-blue-200 text-blue-700',
};

const PRIORITY_LABELS = {
  high: '高',
  medium: '中',
  low: '低',
};

const TYPE_ICONS: Record<AutoSuggestion['type'], JSX.Element> = {
  create_delivery_note: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  ),
  create_invoice: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  follow_up: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function SuggestionsPanel({ fetchSuggestions, companySlug, basePath }: SuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<AutoSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSuggestions();
        if (!cancelled) setSuggestions(data.suggestions);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'サジェストの取得に失敗しました');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [fetchSuggestions]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) return null;
  if (suggestions.length === 0) return null;

  const getActionUrl = (s: AutoSuggestion): string | null => {
    switch (s.type) {
      case 'create_delivery_note':
        return `${basePath}/delivery-notes?createFrom=${s.targetId}`;
      case 'create_invoice':
        return `${basePath}/invoices?createFor=${s.targetId}`;
      case 'follow_up':
        return `${basePath}/invoices?status=overdue`;
      default:
        return null;
    }
  };

  const getActionLabel = (type: AutoSuggestion['type']): string => {
    switch (type) {
      case 'create_delivery_note': return '納品書作成';
      case 'create_invoice': return '請求書作成';
      case 'follow_up': return '確認する';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">
            アクション提案
          </h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {suggestions.length}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-2">
          {suggestions.map((s) => {
            const url = getActionUrl(s);
            return (
              <div
                key={s.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${PRIORITY_COLORS[s.priority]} bg-opacity-50`}
              >
                <div className="flex-shrink-0 mt-0.5 opacity-70">
                  {TYPE_ICONS[s.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{s.title}</p>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border opacity-80">
                      {PRIORITY_LABELS[s.priority]}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5 opacity-80">{s.description}</p>
                </div>
                {url && (
                  <a
                    href={url}
                    className="flex-shrink-0 inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {getActionLabel(s.type)}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
