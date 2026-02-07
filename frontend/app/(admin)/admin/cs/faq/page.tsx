'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Logo } from '@/components/layout/Logo';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { api } from '@/lib/api';
import { Message } from '@/components/chat/ChatContainer';
import type { AdminUser } from '@/types';

export type FAQCategory = '男性会員の方' | '女性会員の方';

// プレビューモード用のスタンドアロンUI（SP最適化）
function PreviewMode() {
  const [faqCategory, setFaqCategory] = useState<FAQCategory | null>(null);

  return (
    <div className="h-[100dvh] flex flex-col bg-white">
      {/* ヘッダー - safe area対応 */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white pt-[env(safe-area-inset-top)]">
        <div className="max-w-4xl mx-auto px-4 py-2 sm:py-3 flex items-center">
          <a
            href="https://helpcenter.bachelorapp.net"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Logo className="h-4 sm:h-5 text-slate-medium" />
            <span className="text-gray-300">|</span>
            <span className="text-sm font-medium text-gray-700">AI bot (研修中🔰)</span>
          </a>
        </div>
      </header>

      {/* チャットエリア */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <ChatContainer
          type="faq"
          faqCategory={faqCategory ?? undefined}
          onCategorySelect={(category) => setFaqCategory(category as FAQCategory)}
          isPreview={true}
        />
      </main>
    </div>
  );
}

function FAQPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [faqCategory, setFaqCategory] = useState<FAQCategory | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);

  // プレビューモードかどうか
  const isPreviewMode = searchParams.get('preview') === '1';

  useEffect(() => {
    // プレビューモードの場合は認証不要
    if (isPreviewMode) {
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      if (api.getAccessToken()) {
        setIsAuthenticated(true);
        setCurrentUser(api.getCurrentUser());
        setIsLoading(false);
        return;
      }

      try {
        await api.refresh();
        setIsAuthenticated(true);
        const user = await api.getMe();
        setCurrentUser(user);
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, isPreviewMode]);

  // 履歴からの復元
  useEffect(() => {
    if (searchParams.get('restore') === 'true') {
      try {
        const stored = localStorage.getItem('restoreChat');
        if (stored) {
          const data = JSON.parse(stored);
          // 5分以内のデータのみ復元
          if (Date.now() - data.timestamp < 5 * 60 * 1000) {
            const messages = data.messages.map((m: Message) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }));
            setInitialMessages(messages);
            if (data.category) {
              setFaqCategory(data.category as FAQCategory);
            }
          }
          localStorage.removeItem('restoreChat');
        }
      } catch {
        // パースエラーは無視
      }
      // URLからrestoreパラメータを削除
      router.replace('/admin/cs/faq');
    }
  }, [searchParams, router]);

  const handleLogout = async () => {
    await api.logout();
    router.push('/admin/login');
  };

  const handleOpenPreview = () => {
    window.open('/admin/cs/faq?preview=1', '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  // プレビューモードの場合はスタンドアロンUIを表示
  if (isPreviewMode) {
    return <PreviewMode />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar currentPage="faq" currentUser={currentUser} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* プレビューボタン */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2 flex justify-end">
          <button
            onClick={handleOpenPreview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            本番UIをプレビュー
          </button>
        </div>
        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatContainer
            type="faq"
            faqCategory={faqCategory ?? undefined}
            initialMessages={initialMessages}
            onCategorySelect={(category) => setFaqCategory(category as FAQCategory)}
          />
        </main>
      </div>
    </div>
  );
}

export default function FAQPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-400">読み込み中...</div>
        </div>
      }
    >
      <FAQPageContent />
    </Suspense>
  );
}
