'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from './Logo';
import { ModuleIcon } from '@/lib/module-icons';
import { api } from '@/lib/api';
import type { AdminUser, SidebarCompany } from '@/types';

export type PageType =
  | 'dashboard'
  | 'faq'
  | 'internal'
  | 'improvements'
  | 'history'
  | 'settings'
  | 'admin-users'
  | 'companies'
  | 'modules'
  | 'black-users'
  | 'black-matchings'
  | 'black-interviews'
  | 'black-venues'
  | 'other';

interface SidebarProps {
  currentPage: PageType;
  currentPath?: string;
  currentUser?: AdminUser | null;
  onLogout?: () => void;
}

export function Sidebar({ currentPage, currentPath, currentUser, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarCompanies, setSidebarCompanies] = useState<SidebarCompany[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // サイドバー用の会社+モジュールデータを取得
  useEffect(() => {
    if (!api.getAccessToken()) return;
    api.getCompaniesSidebar().then((res) => setSidebarCompanies(res.companies)).catch(() => {});
  }, []);

  return (
    <aside
      className={`${collapsed ? 'w-14' : 'w-56'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200`}
    >
      {/* ロゴ + 折りたたみボタン */}
      <div className="px-3 py-3 flex items-center justify-between">
        {!collapsed && (
          <Link href="/admin">
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

      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {/* ダッシュボード（最上部） */}
        <ul className="space-y-1 font-medium">
          <li>
            <Link
              href="/admin"
              className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors group ${
                currentPage === 'dashboard'
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

        {/* CS向け機能 */}
        <div className={`my-3 ${collapsed ? 'mx-2' : ''}`}>
          <div className="border-t border-gray-200" />
        </div>
        {!collapsed && (
          <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            CS
          </div>
        )}
        <ul className="space-y-1 font-medium">
          {/* FAQ チャット */}
          <li>
            <Link
              href="/admin/cs/faq"
              className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors group ${
                currentPage === 'faq'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? 'FAQ チャット' : undefined}
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
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {!collapsed && <span className="ms-3">FAQ チャット</span>}
            </Link>
          </li>

          {/* 内部サポート */}
          <li>
            <Link
              href="/admin/cs/internal"
              className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors group ${
                currentPage === 'internal'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? '内部サポート' : undefined}
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
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              {!collapsed && <span className="ms-3">内部サポート</span>}
            </Link>
          </li>

          {/* ナレッジ改善 */}
          <li>
            <Link
              href="/admin/cs/improvements"
              className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors group ${
                currentPage === 'improvements'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? 'ナレッジ改善' : undefined}
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
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              {!collapsed && <span className="ms-3">ナレッジ改善</span>}
            </Link>
          </li>
        </ul>

        {/* Black向け機能 */}
        <div className={`my-3 ${collapsed ? 'mx-2' : ''}`}>
          <div className="border-t border-gray-200" />
        </div>
        {!collapsed && (
          <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Black
          </div>
        )}
        <ul className="space-y-1 font-medium">
          {/* ユーザー */}
          <li>
            <Link
              href="/admin/black/users"
              className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors group ${
                currentPage === 'black-users'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? 'ユーザー' : undefined}
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {!collapsed && <span className="ms-3">ユーザー</span>}
            </Link>
          </li>

          {/* マッチング */}
          <li>
            <Link
              href="/admin/black/matchings"
              className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors group ${
                currentPage === 'black-matchings'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? 'マッチング' : undefined}
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {!collapsed && <span className="ms-3">マッチング</span>}
            </Link>
          </li>

          {/* 面談 */}
          <li>
            <Link
              href="/admin/black/interviews"
              className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors group ${
                currentPage === 'black-interviews'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? '面談' : undefined}
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
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              {!collapsed && <span className="ms-3">面談</span>}
            </Link>
          </li>

          {/* レストラン */}
          <li>
            <Link
              href="/admin/black/venues"
              className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors group ${
                currentPage === 'black-venues'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? 'レストラン' : undefined}
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              {!collapsed && <span className="ms-3">レストラン</span>}
            </Link>
          </li>
        </ul>

        {/* 会社ごとのセクション（動的） */}
        {sidebarCompanies.map((company) => (
          <div key={company.id}>
            <div className={`my-3 ${collapsed ? 'mx-2' : ''}`}>
              <div className="border-t border-gray-200" />
            </div>
            {!collapsed && (
              <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider truncate" title={company.name}>
                {company.name}
              </div>
            )}
            <ul className="space-y-1 font-medium">
              {company.modules.map((mod) => {
                const modulePath = `/admin/c/${company.slug}/${mod.slug}`;
                const isActive = currentPath === modulePath;
                return (
                  <li key={mod.id}>
                    <Link
                      href={modulePath}
                      className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors group ${
                        isActive
                          ? 'bg-gray-100 text-gray-900 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } ${collapsed ? 'justify-center' : ''}`}
                      title={collapsed ? `${company.name} - ${mod.name}` : undefined}
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
              {company.modules.length === 0 && !collapsed && (
                <li className="px-2 py-2 text-xs text-gray-400 italic">モジュールなし</li>
              )}
            </ul>
          </div>
        ))}

        {/* 管理機能 */}
        <div className={`my-3 ${collapsed ? 'mx-2' : ''}`}>
          <div className="border-t border-gray-200" />
        </div>
        {!collapsed && (
          <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            管理
          </div>
        )}
        <ul className="space-y-1 font-medium">
          {/* 管理者アカウント */}
          <li>
            <Link
              href="/admin/users"
              className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors group ${
                currentPage === 'admin-users'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? '管理者アカウント' : undefined}
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              {!collapsed && <span className="ms-3">管理者アカウント</span>}
            </Link>
          </li>

          {/* 会社管理 */}
          <li>
            <Link
              href="/admin/companies"
              className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors group ${
                currentPage === 'companies'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? '会社管理' : undefined}
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              {!collapsed && <span className="ms-3">会社管理</span>}
            </Link>
          </li>

          {/* モジュール管理 */}
          <li>
            <Link
              href="/admin/modules"
              className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors group ${
                currentPage === 'modules'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? 'モジュール管理' : undefined}
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
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              {!collapsed && <span className="ms-3">モジュール管理</span>}
            </Link>
          </li>

          {/* 履歴 */}
          <li>
            <Link
              href="/admin/history"
              className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors group ${
                currentPage === 'history'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? '履歴' : undefined}
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {!collapsed && <span className="ms-3">履歴</span>}
            </Link>
          </li>

          {/* 設定 */}
          <li>
            <Link
              href="/admin/settings"
              className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors group ${
                currentPage === 'settings'
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

      {/* ユーザーメニュー */}
      {currentUser && (
        <div className="px-3 py-3 border-t border-gray-200 relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`flex items-center w-full px-2 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 group ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? currentUser.username : undefined}
          >
            {/* アバター */}
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-xs flex-shrink-0">
              {currentUser.username[0].toUpperCase()}
            </div>
            {!collapsed && (
              <>
                <div className="ms-3 flex-1 text-left truncate">
                  <div className="font-medium text-gray-900 truncate">{currentUser.username}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {currentUser.email || currentUser.role}
                  </div>
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

          {/* ドロップダウンメニュー */}
          {showUserMenu && (
            <div
              className={`absolute ${collapsed ? 'left-full ml-2' : 'left-3 right-3'} bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50`}
            >
              {/* ユーザー情報（折りたたみ時のみ表示） */}
              {collapsed && (
                <div className="px-4 py-2 border-b border-gray-100">
                  <div className="font-medium text-gray-900">{currentUser.username}</div>
                  <div className="text-xs text-gray-500">{currentUser.email}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {currentUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </div>
                </div>
              )}
              {onLogout && (
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
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
