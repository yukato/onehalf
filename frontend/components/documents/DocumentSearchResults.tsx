'use client';

import type { DocumentSearchResult } from '@/types';

interface DocumentSearchResultsProps {
  results: DocumentSearchResult[];
  query: string;
  onClose: () => void;
}

export function DocumentSearchResults({ results, query, onClose }: DocumentSearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p className="text-sm text-gray-500">「{query}」に一致する書類が見つかりませんでした</p>
        <button onClick={onClose} className="mt-3 text-sm text-primary hover:text-primary/80">
          検索を閉じる
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          「{query}」の検索結果: {results.length}件
        </p>
        <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">
          検索を閉じる
        </button>
      </div>

      {results.map((result) => (
        <div key={result.document.id} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="text-sm font-medium text-gray-900">{result.document.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                {result.document.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-xs text-gray-400">
              スコア: {(result.maxScore * 100).toFixed(0)}%
            </div>
          </div>

          <div className="space-y-2 mt-3">
            {result.relevantChunks.map((chunk, i) => (
              <div key={i} className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-600 line-clamp-3">{chunk.content}</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  関連度: {(chunk.score * 100).toFixed(0)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
