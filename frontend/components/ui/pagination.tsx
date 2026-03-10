'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  /** 現在のページ（1始まり） */
  currentPage: number;
  /** 総ページ数 */
  totalPages: number;
  /** ページ変更コールバック */
  onPageChange: (page: number) => void;
  /** 表示するページ番号の最大数 */
  maxVisiblePages?: number;
  /** 追加のクラス名 */
  className?: string;
}

function getVisiblePages(currentPage: number, totalPages: number, maxVisible: number): (number | 'ellipsis')[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  const pages: (number | 'ellipsis')[] = [];

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('ellipsis');
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
  }

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 5,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getVisiblePages(currentPage, totalPages, maxVisiblePages);

  return (
    <nav aria-label="ページネーション" className={cn('flex items-center justify-center gap-1', className)}>
      <button
        type="button"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="inline-flex items-center justify-center rounded-md p-2 min-h-[44px] min-w-[44px] text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 transition-colors"
        aria-label="最初のページ"
      >
        <ChevronsLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="inline-flex items-center justify-center rounded-md p-2 min-h-[44px] min-w-[44px] text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 transition-colors"
        aria-label="前のページ"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((page, index) =>
        page === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="px-1 text-muted-foreground">
            ...
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={cn(
              'inline-flex items-center justify-center rounded-md min-w-[36px] h-9 px-2 text-sm font-medium transition-colors',
              page === currentPage
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            aria-label={`ページ ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="inline-flex items-center justify-center rounded-md p-2 min-h-[44px] min-w-[44px] text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 transition-colors"
        aria-label="次のページ"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="inline-flex items-center justify-center rounded-md p-2 min-h-[44px] min-w-[44px] text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 transition-colors"
        aria-label="最後のページ"
      >
        <ChevronsRight className="w-4 h-4" />
      </button>
    </nav>
  );
}

interface PaginationInfoProps {
  currentPage: number;
  perPage: number;
  totalItems: number;
  className?: string;
}

export function PaginationInfo({ currentPage, perPage, totalItems, className }: PaginationInfoProps) {
  if (totalItems === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        0件
      </p>
    );
  }

  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, totalItems);

  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {totalItems}件中 {start}〜{end}件を表示
    </p>
  );
}
