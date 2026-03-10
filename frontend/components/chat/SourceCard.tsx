'use client';

import type { FAQSource } from '@/types';

interface SourceCardProps {
  source: FAQSource;
  /** プレビューモード（類似度非表示） */
  isPreview?: boolean;
}

export function SourceCard({ source, isPreview = false }: SourceCardProps) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {source.title}
          </p>
        </div>
        {!isPreview && (
          <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            類似度: {(source.score * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </a>
  );
}
