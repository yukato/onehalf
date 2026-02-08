'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { api } from '@/lib/api';
import { formatDateTimeJa } from '@/lib/utils';
import type { DataStatusResponse, DataSourceStatus, AdminUser } from '@/types';

const FEATURE_CARDS = [
  {
    title: 'FAQ チャット',
    description: 'よくある質問からお問い合わせ対応を検索',
    href: '/admin/cs/faq',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    color: 'blue',
  },
  {
    title: '内部サポート',
    description: '過去の対応履歴から類似事例を検索',
    href: '/admin/cs/internal',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    color: 'green',
  },
];

const COLOR_CLASSES = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    hover: 'hover:border-blue-400 hover:bg-blue-100',
    icon: 'text-blue-500',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    hover: 'hover:border-green-400 hover:bg-green-100',
    icon: 'text-green-500',
  },
};


// Helper function to get relative time
function getRelativeTime(dateString: string | null): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays}日前`;
    } else if (diffHours > 0) {
      return `${diffHours}時間前`;
    } else {
      return '1時間以内';
    }
  } catch {
    return '';
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [dataStatus, setDataStatus] = useState<DataStatusResponse | null>(null);
  const [dataStatusError, setDataStatusError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (api.getAccessToken()) {
        setIsAuthenticated(true);
        setCurrentUser(api.getCurrentUser());
        setIsLoading(false);
        loadDataStatus();
        return;
      }

      try {
        await api.refresh();
        setIsAuthenticated(true);
        const user = await api.getMe();
        setCurrentUser(user);
        loadDataStatus();
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadDataStatus = async () => {
    try {
      const status = await api.getDataStatus();
      setDataStatus(status);
      setDataStatusError(null);
    } catch (err) {
      setDataStatusError(
        err instanceof Error ? err.message : 'データステータスの取得に失敗しました'
      );
    }
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

  const renderDataSourceCard = (source: DataSourceStatus, key: string, href: string) => {
    const isStale =
      source.latest_item_date &&
      new Date().getTime() - new Date(source.latest_item_date).getTime() > 7 * 24 * 60 * 60 * 1000;

    return (
      <a
        key={key}
        href={href}
        className={`block p-4 rounded-lg border transition-all cursor-pointer ${
          isStale
            ? 'border-yellow-300 bg-yellow-50 hover:border-yellow-400 hover:bg-yellow-100'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900">{source.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-700">
              {source.count.toLocaleString()}
            </span>
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
        <div className="space-y-1 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>最新データ日時:</span>
            <span className={isStale ? 'text-yellow-600 font-medium' : ''}>
              {formatDateTimeJa(source.latest_item_date)}
              {source.latest_item_date && (
                <span className="ml-1 text-gray-400">
                  ({getRelativeTime(source.latest_item_date)})
                </span>
              )}
            </span>
          </div>
          {source.latest_ticket_id && (
            <div className="flex justify-between">
              <span>最新チケットID:</span>
              <span>#{source.latest_ticket_id}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>ファイル更新:</span>
            <span>{formatDateTimeJa(source.file_updated_at)}</span>
          </div>
        </div>
        {source.error && <p className="mt-2 text-xs text-red-500">{source.error}</p>}
      </a>
    );
  };

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar currentPage="dashboard" currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 flex flex-col overflow-auto p-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">ダッシュボード</h1>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mb-8">
          {FEATURE_CARDS.map((card) => {
            const colors = COLOR_CLASSES[card.color as keyof typeof COLOR_CLASSES];
            return (
              <a
                key={card.href}
                href={card.href}
                className={`block p-4 rounded-lg border transition-all ${colors.bg} ${colors.border} ${colors.hover}`}
              >
                <div className={`mb-2 ${colors.icon}`}>{card.icon}</div>
                <h2 className="text-sm font-medium text-gray-900 mb-1">{card.title}</h2>
                <p className="text-xs text-gray-500">{card.description}</p>
              </a>
            );
          })}
        </div>

        {/* Data Status Section */}
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">データ読み込み状況</h2>
            <button onClick={loadDataStatus} className="text-xs text-blue-600 hover:text-blue-800">
              更新
            </button>
          </div>

          {dataStatusError && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              {dataStatusError}
            </div>
          )}

          {dataStatus ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              {renderDataSourceCard(dataStatus.articles, 'articles', '/admin/browse/articles')}
              {renderDataSourceCard(dataStatus.tickets, 'tickets', '/admin/browse/tickets')}
              {renderDataSourceCard(dataStatus.macros, 'macros', '/admin/browse/macros')}
            </div>
          ) : (
            <div className="text-xs text-gray-400">読み込み中...</div>
          )}
        </div>
      </main>
    </div>
  );
}
