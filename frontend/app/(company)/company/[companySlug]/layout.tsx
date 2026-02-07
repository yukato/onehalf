'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { CompanySidebar } from '@/components/layout/CompanySidebar';
import { companyApi } from '@/lib/company-api';
import type { CompanyModuleAssignment } from '@/types';

export default function CompanyDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const companySlug = params.companySlug as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [userName, setUserName] = useState('');
  const [modules, setModules] = useState<CompanyModuleAssignment[]>([]);

  // Extract current module slug from pathname: /company/[slug]/m/[moduleSlug]
  const pathParts = pathname.split('/');
  const mIndex = pathParts.indexOf('m');
  const currentModuleSlug = mIndex !== -1 && pathParts[mIndex + 1] ? pathParts[mIndex + 1] : undefined;

  useEffect(() => {
    const checkAuth = async () => {
      if (companyApi.getAccessToken()) {
        const user = companyApi.getCurrentUser();
        if (user) {
          setCompanyName(user.company.name);
          setUserName(user.username);
          setIsAuthenticated(true);
          try {
            const mods = await companyApi.getModules();
            setModules(mods);
          } catch {
            // modules load failed, continue with empty
          }
          setIsLoading(false);
          return;
        }
      }

      try {
        await companyApi.refresh();
        const user = await companyApi.getMe();
        if (user.company.slug !== companySlug) {
          router.push(`/company/${user.company.slug}`);
          return;
        }
        setCompanyName(user.company.name);
        setUserName(user.username);
        setIsAuthenticated(true);
        try {
          const mods = await companyApi.getModules();
          setModules(mods);
        } catch {
          // modules load failed, continue with empty
        }
      } catch {
        router.push('/company/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, companySlug]);

  const handleLogout = async () => {
    await companyApi.logout();
    router.push('/company/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="h-screen flex bg-gray-50">
      <CompanySidebar
        companySlug={companySlug}
        companyName={companyName}
        userName={userName}
        modules={modules}
        currentModuleSlug={currentModuleSlug}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
