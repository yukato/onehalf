'use client';

import { useRouter } from 'next/navigation';
import { Sidebar, PageType } from './Sidebar';
import type { AdminUser } from '@/types';

interface PageLayoutProps {
  /** Current page for sidebar highlighting */
  currentPage: PageType;
  /** Page title displayed in header */
  title: string;
  /** Show back button (defaults to true for non-main pages) */
  showBackButton?: boolean;
  /** Custom back navigation path (defaults to '/') */
  backPath?: string;
  /** Current logged in user */
  currentUser?: AdminUser | null;
  /** Logout handler */
  onLogout: () => void;
  /** Page content */
  children: React.ReactNode;
  /** Optional header actions (buttons, etc.) */
  headerActions?: React.ReactNode;
}

export function PageLayout({
  currentPage,
  title,
  showBackButton = true,
  backPath = '/admin',
  currentUser,
  onLogout,
  children,
  headerActions,
}: PageLayoutProps) {
  const router = useRouter();

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar currentPage={currentPage} currentUser={currentUser} onLogout={onLogout} />
      <main className="flex-1 flex flex-col overflow-hidden p-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <button
                onClick={() => router.push(backPath)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="戻る"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          </div>
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
