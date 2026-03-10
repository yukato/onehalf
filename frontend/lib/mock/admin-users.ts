import type { AdminUser } from '@/types';

export const mockAdminUsers: AdminUser[] = [
  {
    id: '1',
    username: 'admin',
    email: 'm.yukato@gmail.com',
    role: 'super_admin',
    isActive: true,
    createdAt: '2025-04-01T00:00:00.000Z',
    lastLogin: '2026-03-10T09:00:00.000Z',
  },
  {
    id: '2',
    username: '田中 太郎',
    email: 'tanaka@onehalf.jp',
    role: 'admin',
    isActive: true,
    createdAt: '2025-06-01T00:00:00.000Z',
    lastLogin: '2026-03-09T14:30:00.000Z',
  },
  {
    id: '3',
    username: '佐藤 花子',
    email: 'sato@onehalf.jp',
    role: 'admin',
    isActive: true,
    createdAt: '2025-08-15T00:00:00.000Z',
    lastLogin: '2026-03-08T10:00:00.000Z',
  },
];
