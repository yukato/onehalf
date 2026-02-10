'use client';

import { useState, useEffect } from 'react';
import type { AiAnalysisResult } from '@/types';

interface AiInsightsProps {
  companySlug: string;
  isAdmin?: boolean;
  fetchFn: (refresh?: boolean) => Promise<AiAnalysisResult>;
}

function simpleMarkdownToHtml(md: string): string {
  let html = md
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-semibold text-gray-800 mt-4 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-semibold text-gray-800 mt-5 mb-2">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-lg font-bold text-gray-900 mt-6 mb-2">$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Unordered list items
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-700 text-sm leading-relaxed">$1</li>')
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-gray-700 text-sm leading-relaxed">$1</li>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="my-4 border-gray-200">')
    // Line breaks (double newline = paragraph break)
    .replace(/\n\n/g, '</p><p class="text-sm text-gray-700 leading-relaxed mb-2">')
    .replace(/\n/g, '<br>');

  html = '<p class="text-sm text-gray-700 leading-relaxed mb-2">' + html + '</p>';

  // Clean up empty paragraphs
  html = html.replace(/<p[^>]*><\/p>/g, '');

  return html;
}

export function AiInsights({ companySlug, fetchFn }: AiInsightsProps) {
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchFn(false);
        if (!cancelled) setResult(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'AI分析の取得に失敗しました');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [companySlug, fetchFn]);

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      setError(null);
      const data = await fetchFn(true);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI分析の再生成に失敗しました');
    } finally {
      setRegenerating(false);
    }
  };

  const isNoApiKey = result?.analysis.includes('API keyが設定されていません');

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-200 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-800">AI分析</h3>
          {result?.generatedAt && !loading && (
            <span className="text-xs text-gray-400 ml-2">
              {new Date(result.generatedAt).toLocaleString('ja-JP', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })} 生成
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!loading && !isNoApiKey && (
            <button
              onClick={(e) => { e.stopPropagation(); handleRegenerate(); }}
              disabled={regenerating}
              className="text-xs px-2.5 py-1 rounded-md text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              {regenerating ? '分析中...' : '再分析'}
            </button>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="px-5 py-4">
          {/* Loading */}
          {(loading || regenerating) && (
            <div className="space-y-3 animate-pulse">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-4 h-4 rounded-full bg-amber-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-4 h-4 rounded-full bg-amber-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-4 h-4 rounded-full bg-amber-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-sm text-gray-500 ml-1">
                  {regenerating ? 'AI分析を再生成中...' : 'AI分析を読み込み中...'}
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-5/6" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          )}

          {/* Error */}
          {error && !loading && !regenerating && (
            <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">
              {error}
            </div>
          )}

          {/* No API Key */}
          {!loading && !regenerating && !error && isNoApiKey && (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-md p-4 text-center">
              <p className="mb-2">API keyが設定されていません。</p>
              <p className="text-xs text-gray-500">
                設定ページでAPI keyを設定するとAI分析が利用可能になります。
              </p>
            </div>
          )}

          {/* Analysis Result */}
          {!loading && !regenerating && !error && result && !isNoApiKey && (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(result.analysis) }}
            />
          )}
        </div>
      )}
    </div>
  );
}
