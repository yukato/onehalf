'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/PageLayout';
import { SearchBox } from '@/components/ui/SearchBox';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { ArticleItem } from '@/types';

export default function ArticlesPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<ArticleItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  useEffect(() => {
    const checkAuth = async () => {
      if (api.getAccessToken()) {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      try {
        await api.refresh();
        setIsAuthenticated(true);
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const fetchData = useCallback(async () => {
    setIsFetching(true);
    setError(null);
    try {
      const response = await api.getArticles(searchQuery || undefined, limit, offset);
      setItems(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setIsFetching(false);
    }
  }, [searchQuery, offset]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  const handleSearch = () => {
    setOffset(0);
    setSearchQuery(searchInput);
  };

  const handleLogout = async () => {
    await api.logout();
    router.push('/admin/login');
  };


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <PageLayout currentPage="dashboard" title="FAQ記事一覧" onLogout={handleLogout}>
      <div className="mb-4 flex items-center gap-4">
        <SearchBox
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={handleSearch}
          placeholder="タイトルで検索..."
          isLoading={isFetching}
          showClear={!!searchQuery}
          onClear={() => {
            setSearchInput('');
            setSearchQuery('');
            setOffset(0);
          }}
          className="flex-1 max-w-md"
        />
        <div className="text-sm text-gray-500">{isFetching ? '読み込み中...' : `${total}件`}</div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-white rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600 w-20">ID</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">タイトル</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 w-40">カテゴリ</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 w-28">更新日</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => item.url && window.open(item.url, '_blank')}
              >
                <td className="px-3 py-2 text-gray-500 font-mono text-xs">{item.id}</td>
                <td className="px-3 py-2 text-gray-700">
                  <div className="hover:text-blue-600 transition-colors flex items-center gap-1">
                    {item.title}
                    <svg
                      className="w-3 h-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </div>
                </td>
                <td className="px-3 py-2 text-gray-500 text-xs">{item.category || '-'}</td>
                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                  {formatDate(item.updated_at)}
                </td>
              </tr>
            ))}
            {items.length === 0 && !isFetching && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-gray-400">
                  データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            前へ
          </button>
          <span className="text-sm text-gray-600">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            次へ
          </button>
        </div>
      )}
    </PageLayout>
  );
}
