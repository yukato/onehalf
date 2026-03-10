import useSWR from 'swr';
import { api } from '@/lib/api';
import type { SidebarCompany } from '@/types';

const IS_MOCK = process.env.NEXT_PUBLIC_AUTH_MOCK === 'true';

const fetcher = async (): Promise<SidebarCompany[]> => {
  if (IS_MOCK) {
    const { mockSidebarCompaniesResponse } = await import('@/lib/mock');
    return mockSidebarCompaniesResponse.companies;
  }
  if (!api.getAccessToken()) return [];
  const res = await api.getCompaniesSidebar();
  return res.companies;
};

export function useSidebarCompanies() {
  const { data, error, isLoading } = useSWR<SidebarCompany[]>(
    'sidebar-companies',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60_000, // 1分間は再フェッチしない
    }
  );

  return {
    companies: data ?? [],
    isLoading,
    error,
  };
}
