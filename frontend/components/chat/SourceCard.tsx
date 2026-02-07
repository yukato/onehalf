'use client';

import type { FAQSource, TicketSource } from '@/types';

type Source = FAQSource | TicketSource;

interface SourceCardProps {
  source: Source;
  /** プレビューモード（類似度非表示） */
  isPreview?: boolean;
}

function isTicketSource(source: Source): source is TicketSource {
  return 'ticket_id' in source;
}

export function SourceCard({ source, isPreview = false }: SourceCardProps) {
  const isTicket = isTicketSource(source);

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
            {isTicket ? `#${source.ticket_id} ${source.subject}` : source.title}
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
