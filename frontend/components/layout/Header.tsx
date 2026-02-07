'use client';

import Link from 'next/link';
import { Logo } from './Logo';

export type FAQCategory = '男性会員の方' | '女性会員の方';

interface HeaderProps {
  currentPage: 'faq' | 'internal';
  onLogout?: () => void;
  faqCategory?: FAQCategory;
  onFaqCategoryChange?: (category: FAQCategory) => void;
}

export function Header({ currentPage, onLogout, faqCategory, onFaqCategoryChange }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Logo className="h-6 text-slate-medium" />
          <nav className="flex items-center gap-4">
            <Link
              href="/admin/cs/internal"
              className={`text-sm px-3 py-1 rounded-md transition-colors ${
                currentPage === 'internal'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              内部サポート
            </Link>
            <Link
              href="/admin/cs/faq"
              className={`text-sm px-3 py-1 rounded-md transition-colors ${
                currentPage === 'faq'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              FAQ チャット
            </Link>
            {currentPage === 'faq' && onFaqCategoryChange && (
              <select
                value={faqCategory}
                onChange={(e) => onFaqCategoryChange(e.target.value as FAQCategory)}
                className="text-sm px-3 py-1 rounded-md border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              >
                <option value="男性会員の方">男性会員</option>
                <option value="女性会員の方">女性会員</option>
              </select>
            )}
          </nav>
        </div>
        {onLogout && (
          <button onClick={onLogout} className="text-sm text-gray-500 hover:text-gray-700">
            ログアウト
          </button>
        )}
      </div>
    </header>
  );
}
