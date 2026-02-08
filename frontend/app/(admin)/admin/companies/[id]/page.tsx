'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageLayout } from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { formatDate, formatDateTimeJa } from '@/lib/utils';
import type { AdminUser, Company, CompanyUser, CompanyModuleWithAssignment } from '@/types';

interface CompanyWithCount extends Company {
  userCount: number;
}

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [company, setCompany] = useState<CompanyWithCount | null>(null);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit company
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', slug: '', isActive: true });
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // User modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ email: '', username: '', password: '', role: 'member' });
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Modules
  const [companyModules, setCompanyModules] = useState<CompanyModuleWithAssignment[]>([]);
  const [moduleChanges, setModuleChanges] = useState<Map<string, boolean>>(new Map());
  const [isSavingModules, setIsSavingModules] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingUserName, setDeletingUserName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (api.getAccessToken()) {
        setIsAuthenticated(true);
        setCurrentUser(api.getCurrentUser());
        await loadData();
        setIsLoading(false);
        return;
      }

      try {
        await api.refresh();
        setIsAuthenticated(true);
        const user = await api.getMe();
        setCurrentUser(user);
        await loadData();
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, companyId]);

  const loadData = async () => {
    try {
      const [companyData, usersData, modulesData] = await Promise.all([
        api.getCompany(companyId),
        api.getCompanyUsers(companyId),
        api.getCompanyModules(companyId),
      ]);
      const c = companyData as CompanyWithCount;
      setCompany(c);
      setUsers(usersData.users);
      setCompanyModules(modulesData.modules);
      setModuleChanges(new Map());
      setEditForm({ name: c.name, slug: c.slug, isActive: c.isActive });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load company');
    }
  };

  const handleLogout = async () => {
    await api.logout();
    router.push('/admin/login');
  };

  const handleSaveCompany = async () => {
    setEditError(null);
    setIsSavingCompany(true);
    try {
      await api.updateCompany(companyId, editForm);
      setIsEditing(false);
      await loadData();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update company');
    } finally {
      setIsSavingCompany(false);
    }
  };

  const openCreateUserModal = () => {
    setModalMode('create');
    setEditingUserId(null);
    setUserForm({ email: '', username: '', password: '', role: 'member' });
    setUserFormError(null);
    setShowUserModal(true);
  };

  const openEditUserModal = (user: CompanyUser) => {
    setModalMode('edit');
    setEditingUserId(user.id);
    setUserForm({ email: user.email, username: user.username, password: '', role: user.role });
    setUserFormError(null);
    setShowUserModal(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError(null);
    setIsSavingUser(true);

    try {
      if (modalMode === 'create') {
        await api.createCompanyUser(companyId, {
          email: userForm.email,
          username: userForm.username,
          password: userForm.password,
          role: userForm.role,
        });
      } else if (editingUserId) {
        await api.updateCompanyUser(companyId, editingUserId, {
          email: userForm.email,
          username: userForm.username,
          password: userForm.password || undefined,
          role: userForm.role,
        });
      }
      setShowUserModal(false);
      await loadData();
    } catch (err) {
      setUserFormError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUserId) return;
    setIsDeleting(true);
    try {
      await api.deleteCompanyUser(companyId, deletingUserId);
      setShowDeleteConfirm(false);
      setDeletingUserId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleUserActive = async (user: CompanyUser) => {
    try {
      await api.updateCompanyUser(companyId, user.id, { isActive: !user.isActive });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
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
    <PageLayout
      currentPage="companies"
      title={company?.name || '会社詳細'}
      currentUser={currentUser}
      onLogout={handleLogout}
      backPath="/admin/companies"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Company Info */}
        {company && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">会社情報</h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  編集
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({ name: company.name, slug: company.slug, isActive: company.isActive });
                      setEditError(null);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveCompany}
                    disabled={isSavingCompany}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {isSavingCompany ? '保存中...' : '保存'}
                  </button>
                </div>
              )}
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {editError}
              </div>
            )}

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">会社名</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">スラッグ</label>
                  <input
                    type="text"
                    value={editForm.slug}
                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                    pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">ステータス</label>
                  <button
                    onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                    className={`px-3 py-1 text-xs rounded-full ${
                      editForm.isActive
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {editForm.isActive ? '有効' : '無効'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">会社名</span>
                  <p className="font-medium text-gray-900">{company.name}</p>
                </div>
                <div>
                  <span className="text-gray-500">スラッグ</span>
                  <p className="font-mono text-gray-900">{company.slug}</p>
                </div>
                <div>
                  <span className="text-gray-500">ステータス</span>
                  <p>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        company.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {company.isActive ? '有効' : '無効'}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">作成日</span>
                  <p className="text-gray-900">
                    {formatDate(company.createdAt)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              ユーザー ({users.length})
            </h2>
            <button
              onClick={openCreateUserModal}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              ユーザー追加
            </button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ユーザー
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ロール
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最終ログイン
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">#{user.id}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.username}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleUserActive(user)}
                      className={`px-2 py-1 text-xs rounded-full ${
                        user.isActive
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {user.isActive ? '有効' : '無効'}
                    </button>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTimeJa(user.lastLogin ?? null)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEditUserModal(user)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="編集"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setDeletingUserId(user.id);
                          setDeletingUserName(user.username);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="削除"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    ユーザーがまだ登録されていません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Modules */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">モジュール</h2>
            {moduleChanges.size > 0 && (
              <button
                onClick={async () => {
                  setIsSavingModules(true);
                  try {
                    const assignments = Array.from(moduleChanges.entries()).map(
                      ([moduleId, isActive]) => ({ moduleId, isActive })
                    );
                    await api.updateCompanyModules(companyId, { assignments });
                    await loadData();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to update modules');
                  } finally {
                    setIsSavingModules(false);
                  }
                }}
                disabled={isSavingModules}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSavingModules ? '保存中...' : '変更を保存'}
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-200">
            {companyModules.map((mod) => {
              const currentState = moduleChanges.has(mod.id)
                ? moduleChanges.get(mod.id)!
                : mod.assigned && mod.assignmentIsActive;
              return (
                <div
                  key={mod.id}
                  className="px-6 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{mod.name}</div>
                      <div className="text-xs text-gray-500">
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded">{mod.slug}</code>
                        {mod.description && (
                          <span className="ml-2">{mod.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!mod.isActive && (
                      <span className="text-xs text-red-500">（モジュール無効）</span>
                    )}
                    <button
                      onClick={() => {
                        const originalState = mod.assigned && mod.assignmentIsActive;
                        const newState = !currentState;
                        const newChanges = new Map(moduleChanges);
                        if (newState === originalState) {
                          newChanges.delete(mod.id);
                        } else {
                          newChanges.set(mod.id, newState);
                        }
                        setModuleChanges(newChanges);
                      }}
                      disabled={!mod.isActive}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        !mod.isActive
                          ? 'bg-gray-200 cursor-not-allowed'
                          : currentState
                            ? 'bg-blue-600'
                            : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          currentState ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
            {companyModules.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500 text-sm">
                モジュールがまだ登録されていません
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Create/Edit Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-12 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 mb-12">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {modalMode === 'create' ? 'ユーザー追加' : 'ユーザー編集'}
              </h2>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form onSubmit={handleUserSubmit}>
              <div className="p-6 space-y-4">
                {userFormError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {userFormError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    表示名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="山田太郎"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    パスワード {modalMode === 'create' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder={modalMode === 'edit' ? '変更する場合のみ入力' : ''}
                    required={modalMode === 'create'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ロール</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isSavingUser
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isSavingUser ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">ユーザーを削除</h3>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-medium text-gray-900">{deletingUserName}</span>{' '}
              を削除してもよろしいですか？この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingUserId(null);
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? '削除中...' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
