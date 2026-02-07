'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { api } from '@/lib/api';
import { Message } from '@/components/chat/ChatContainer';
import type { AdminUser } from '@/types';

function InternalPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);

  useEffect(() => {
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
  }, [router]);

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
          }
          localStorage.removeItem('restoreChat');
        }
      } catch {
        // パースエラーは無視
      }
      // URLからrestoreパラメータを削除
      router.replace('/admin/cs/internal');
    }
  }, [searchParams, router]);

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

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar currentPage="internal" currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <ChatContainer type="internal" initialMessages={initialMessages} />
      </main>
    </div>
  );
}

export default function InternalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-400">読み込み中...</div>
        </div>
      }
    >
      <InternalPageContent />
    </Suspense>
  );
}
