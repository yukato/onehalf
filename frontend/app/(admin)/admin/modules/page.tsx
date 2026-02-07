'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import type { AdminUser, CompanyModule } from '@/types';

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const ICON_OPTIONS = [
  { value: 'search', label: '検索' },
  { value: 'document', label: '書類' },
  { value: 'chart', label: 'チャート' },
  { value: 'report', label: 'レポート' },
  { value: 'mail', label: 'メール' },
  { value: 'users', label: 'ユーザー' },
  { value: 'settings', label: '設定' },
  { value: 'calendar', label: 'カレンダー' },
  { value: 'database', label: 'データベース' },
  { value: 'chat', label: 'チャット' },
];

interface ModuleWithCount extends CompanyModule {
  assignmentCount: number;
}

export default function ModulesPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modules, setModules] = useState<ModuleWithCount[]>([]);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleWithCount | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'document',
    sortOrder: 0,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (api.getAccessToken()) {
        setIsAuthenticated(true);
        setCurrentUser(api.getCurrentUser());
        await loadModules();
        setIsLoading(false);
        return;
      }

      try {
        await api.refresh();
        setIsAuthenticated(true);
        const user = await api.getMe();
        setCurrentUser(user);
        await loadModules();
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadModules = async () => {
    try {
      const data = await api.getModules();
      setModules(data.modules as ModuleWithCount[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load modules');
    }
  };

  const handleLogout = async () => {
    await api.logout();
    router.push('/admin/login');
  };

  const autoSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const openCreateModal = () => {
    setEditingModule(null);
    setFormData({ name: '', slug: '', description: '', icon: 'document', sortOrder: 0 });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (mod: ModuleWithCount) => {
    setEditingModule(mod);
    setFormData({
      name: mod.name,
      slug: mod.slug,
      description: mod.description || '',
      icon: mod.icon,
      sortOrder: mod.sortOrder,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!SLUG_REGEX.test(formData.slug)) {
      setFormError('スラッグは英小文字・数字・ハイフンのみ使用できます');
      return;
    }

    setIsSaving(true);
    try {
      if (editingModule) {
        await api.updateModule(editingModule.id, {
          name: formData.name,
          slug: formData.slug,
          description: formData.description || undefined,
          icon: formData.icon,
          sortOrder: formData.sortOrder,
        });
      } else {
        await api.createModule({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || undefined,
          icon: formData.icon,
          sortOrder: formData.sortOrder,
        });
      }
      setShowModal(false);
      await loadModules();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save module');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (mod: ModuleWithCount) => {
    try {
      await api.updateModule(mod.id, { isActive: !mod.isActive });
      await loadModules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update module');
    }
  };

  const handleDelete = async (mod: ModuleWithCount) => {
    if (!confirm(`「${mod.name}」を削除しますか？この操作は取り消せません。`)) return;
    try {
      await api.deleteModule(mod.id);
      await loadModules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete module');
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
      currentPage="modules"
      title="モジュール管理"
      currentUser={currentUser}
      onLogout={handleLogout}
      headerActions={
        <button
          onClick={openCreateModal}
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
          新規作成
        </button>
      }
    >
      <div>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                  順序
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  モジュール名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  スラッグ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  アイコン
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  利用会社数
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {modules.map((mod) => (
                <tr key={mod.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mod.sortOrder}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{mod.name}</div>
                    {mod.description && (
                      <div className="text-xs text-gray-500 mt-0.5">{mod.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <code className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      {mod.slug}
                    </code>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mod.icon}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                    {mod.assignmentCount}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(mod)}
                      className={`px-2 py-1 text-xs rounded-full ${
                        mod.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {mod.isActive ? '有効' : '無効'}
                    </button>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(mod)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(mod)}
                        className="text-red-600 hover:text-red-800"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {modules.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    モジュールがまだ登録されていません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-12 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 mb-12">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingModule ? 'モジュール編集' : '新規モジュール作成'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
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
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {formError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    モジュール名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData({
                        ...formData,
                        name,
                        slug:
                          formData.slug === autoSlug(formData.name)
                            ? autoSlug(name)
                            : formData.slug,
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="例: 人材検索"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    スラッグ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                    placeholder="talent-search"
                    pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    URLに使用されます（英小文字・数字・ハイフンのみ）
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="モジュールの説明"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">アイコン</label>
                    <select
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      {ICON_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} ({opt.value})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">表示順</label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) =>
                        setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      min={0}
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formData.name.trim() || !formData.slug.trim()}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isSaving || !formData.name.trim() || !formData.slug.trim()
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isSaving ? '保存中...' : editingModule ? '更新' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
