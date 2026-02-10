'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from './Logo';
import { ModuleIcon } from '@/lib/module-icons';
import type { CompanyModuleAssignment } from '@/types';

interface CompanySidebarProps {
  companySlug: string;
  companyName: string;
  userName: string;
  modules: CompanyModuleAssignment[];
  currentModuleSlug?: string;
  onLogout: () => void;
}

export function CompanySidebar({
  companySlug,
  companyName,
  userName,
  modules,
  currentModuleSlug,
  onLogout,
}: CompanySidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDashboard = !currentModuleSlug;

  return (
    <aside
      className={`${collapsed ? 'w-14' : 'w-56'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200`}
    >
      {/* Logo + collapse */}
      <div className="px-3 py-3 flex items-center justify-between">
        {!collapsed && (
          <Link href={`/company/${companySlug}`}>
            <Logo className="h-5 text-slate-medium ml-3 hover:text-slate-medium/80 transition-colors" />
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg ${collapsed ? 'mx-auto' : ''}`}
          title={collapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
          </svg>
        </button>
      </div>

      {/* Company name */}
      {!collapsed && (
        <div className="px-5 pb-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">
            {companyName}
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {/* Dashboard */}
        <ul className="space-y-1 font-medium">
          <li>
            <Link
              href={`/company/${companySlug}`}
              className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors group ${
                isDashboard
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? 'ダッシュボード' : undefined}
            >
              <svg
                className="w-5 h-5 text-gray-400 transition duration-75 group-hover:text-gray-600 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              {!collapsed && <span className="ms-3">ダッシュボード</span>}
            </Link>
          </li>
        </ul>

        {/* Modules */}
        {modules.length > 0 && (
          <>
            <div className={`my-3 ${collapsed ? 'mx-2' : ''}`}>
              <div className="border-t border-gray-200" />
            </div>
            {!collapsed && (
              <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                機能
              </div>
            )}
            <ul className="space-y-1 font-medium">
              {modules.map((assignment) => {
                const mod = assignment.module;
                const isActive = currentModuleSlug === mod.slug;
                return (
                  <li key={assignment.id}>
                    <Link
                      href={`/company/${companySlug}/m/${mod.slug}`}
                      className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors group ${
                        isActive
                          ? 'bg-gray-100 text-gray-900 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } ${collapsed ? 'justify-center' : ''}`}
                      title={collapsed ? mod.name : undefined}
                    >
                      <ModuleIcon
                        icon={mod.icon}
                        className="w-5 h-5 text-gray-400 transition duration-75 group-hover:text-gray-600 flex-shrink-0"
                      />
                      {!collapsed && <span className="ms-3">{mod.name}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* Settings (fixed, not module-dependent) */}
        <div className={`my-3 ${collapsed ? 'mx-2' : ''}`}>
          <div className="border-t border-gray-200" />
        </div>
        <ul className="space-y-1 font-medium">
          <li>
            <Link
              href={`/company/${companySlug}/m/settings`}
              className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors group ${
                currentModuleSlug === 'settings'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? '設定' : undefined}
            >
              <svg
                className="w-5 h-5 text-gray-400 transition duration-75 group-hover:text-gray-600 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {!collapsed && <span className="ms-3">設定</span>}
            </Link>
          </li>
        </ul>
      </nav>

      {/* User menu */}
      <div className="px-3 py-3 border-t border-gray-200 relative" ref={menuRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className={`flex items-center w-full px-2 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 group ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? userName : undefined}
        >
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-xs flex-shrink-0">
            {userName[0]?.toUpperCase() || '?'}
          </div>
          {!collapsed && (
            <>
              <div className="ms-3 flex-1 text-left truncate">
                <div className="font-medium text-gray-900 truncate">{userName}</div>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </>
          )}
        </button>

        {showUserMenu && (
          <div
            className={`absolute ${collapsed ? 'left-full ml-2' : 'left-3 right-3'} bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50`}
          >
            {collapsed && (
              <div className="px-4 py-2 border-b border-gray-100">
                <div className="font-medium text-gray-900">{userName}</div>
              </div>
            )}
            <button
              onClick={() => {
                setShowUserMenu(false);
                onLogout();
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <svg
                className="w-4 h-4 mr-2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              ログアウト
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
