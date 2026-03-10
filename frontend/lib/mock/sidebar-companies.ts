import type { SidebarCompaniesResponse } from '@/types';
import { mockCompanyModules } from './admin-companies';

export const mockSidebarCompaniesResponse: SidebarCompaniesResponse = {
  companies: [
    {
      id: '1',
      name: '株式会社八木厨房機器製作所',
      slug: 'yagichu',
      modules: mockCompanyModules.map((m) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        icon: m.icon,
        sortOrder: m.sortOrder,
      })),
    },
    {
      id: '2',
      name: '株式会社大寅水産',
      slug: 'daitora',
      modules: mockCompanyModules.slice(0, 4).map((m) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        icon: m.icon,
        sortOrder: m.sortOrder,
      })),
    },
  ],
};
