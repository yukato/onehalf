'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { api } from '@/lib/api';
import type { AdminUser } from '@/types';

export default function AdminCompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const companySlug = params.companySlug as string;

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        if (!api.getAccessToken()) {
          await api.refresh();
        }
        const user = api.getCurrentUser() || (await api.getMe());
        if (!user) {
          router.push('/admin/login');
          return;
        }
        setCurrentUser(user);
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [router, companySlug]);

  const handleLogout = async () => {
    await api.logout();
    router.push('/admin/login');
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar
        currentPage="other"
        currentPath={pathname}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
