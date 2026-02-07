'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { ModuleHeader } from '@/components/modules/ModuleHeader';
import { api } from '@/lib/api';
import { ModuleIcon } from '@/lib/module-icons';
import type { AdminUser } from '@/types';

export default function AdminCompanyModulePage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const companySlug = params.companySlug as string;
  const moduleSlug = params.moduleSlug as string;

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [moduleInfo, setModuleInfo] = useState<{
    companyName: string;
    moduleName: string;
    moduleIcon: string;
    moduleDescription: string | null;
  } | null>(null);

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

        // 会社情報とモジュール情報を取得
        const companiesRes = await api.getCompanies();
        const company = companiesRes.companies.find((c) => c.slug === companySlug);
        if (company) {
          const modulesRes = await api.getCompanyModules(company.id);
          const mod = modulesRes.modules.find(
            (m) => m.slug === moduleSlug && m.assigned && m.assignmentIsActive
          );
          if (mod) {
            setModuleInfo({
              companyName: company.name,
              moduleName: mod.name,
              moduleIcon: mod.icon,
              moduleDescription: mod.description,
            });
          }
        }
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [router, companySlug, moduleSlug]);

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

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar currentPage="other" currentPath={pathname} currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ModuleHeader
            moduleName={moduleInfo?.moduleName || moduleSlug}
            companyName={moduleInfo?.companyName || companySlug}
            icon={moduleInfo?.moduleIcon}
          />

          {/* プレビューエリア */}
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              {moduleInfo ? (
                <ModuleIcon icon={moduleInfo.moduleIcon} className="w-8 h-8 text-gray-400" />
              ) : (
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              )}
            </div>
            <h2 className="text-lg font-medium text-gray-700 mb-2">
              {moduleInfo?.moduleName || moduleSlug}
            </h2>
            {moduleInfo?.moduleDescription && (
              <p className="text-sm text-gray-500 mb-4">{moduleInfo.moduleDescription}</p>
            )}
            <p className="text-sm text-gray-400">
              このモジュールのコンテンツは今後追加されます。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
