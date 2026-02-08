'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import type { AdminUser, InterviewType } from '@/types';

const GENDER_LABELS: Record<number, string> = {
  1: '男性向け',
  2: '女性向け',
};

export default function InterviewTypesPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [interviewTypes, setInterviewTypes] = useState<InterviewType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<InterviewType | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    durationMinutes: 60,
    targetGender: '' as string,
    sortOrder: 0,
    isActive: true,
  });

  useEffect(() => {
    const checkAuth = async () => {
      if (api.getAccessToken()) {
        setIsAuthenticated(true);
        setCurrentUser(api.getCurrentUser());
        await loadInterviewTypes();
        setIsLoading(false);
        return;
      }

      try {
        await api.refresh();
        setIsAuthenticated(true);
        const user = await api.getMe();
        setCurrentUser(user);
        await loadInterviewTypes();
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadInterviewTypes = async () => {
    try {
      const res = await api.getInterviewTypes();
      setInterviewTypes(res.interviewTypes);
    } catch (error) {
      console.error('Failed to load interview types:', error);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    router.push('/admin/login');
  };

  const openCreateModal = () => {
    setEditingType(null);
    setFormData({
      name: '',
      code: '',
      durationMinutes: 60,
      targetGender: '',
      sortOrder: interviewTypes.length,
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (type: InterviewType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      code: type.code,
      durationMinutes: type.durationMinutes,
      targetGender: type.targetGender?.toString() || '',
      sortOrder: type.sortOrder,
      isActive: type.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('名前を入力してください');
      return;
    }
    if (!formData.code.trim()) {
      alert('コードを入力してください');
      return;
    }

    try {
      setSaving(true);
      const data = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        durationMinutes: formData.durationMinutes,
        targetGender: formData.targetGender ? parseInt(formData.targetGender) : null,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
      };

      if (editingType) {
        await api.updateInterviewType(editingType.id, data);
      } else {
        await api.createInterviewType(data);
      }

      setShowModal(false);
      loadInterviewTypes();
    } catch (error: unknown) {
      console.error('Failed to save interview type:', error);
      const message = error instanceof Error ? error.message : '保存に失敗しました';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: InterviewType) => {
    if (!confirm(`「${type.name}」を削除してもよろしいですか？`)) return;

    try {
      await api.deleteInterviewType(type.id);
      loadInterviewTypes();
    } catch (error: unknown) {
      console.error('Failed to delete interview type:', error);
      const message = error instanceof Error ? error.message : '削除に失敗しました';
      alert(message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <PageLayout
      currentPage="black-interviews"
      title="面談種類マスタ"
      currentUser={currentUser}
      onLogout={handleLogout}
      headerActions={
        <button
          onClick={openCreateModal}
          className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          追加
        </button>
      }
      backPath="/admin/black/interviews"
    >
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                表示順
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                名前
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                コード
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                所要時間
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                対象
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                ステータス
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {interviewTypes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  面談種類がありません
                </td>
              </tr>
            ) : (
              interviewTypes.map((type) => (
                <tr key={type.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                    {type.sortOrder}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {type.name}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">{type.code}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                    {type.durationMinutes}分
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                    {type.targetGender ? GENDER_LABELS[type.targetGender] : '共通'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        type.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {type.isActive ? '有効' : '無効'}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm">
                    <button
                      onClick={() => openEditModal(type)}
                      className="text-blue-600 hover:text-blue-800 mr-4"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(type)}
                      className="text-red-600 hover:text-red-800"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* モーダル */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingType ? '面談種類を編集' : '面談種類を追加'}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    名前 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light text-sm"
                    placeholder="初回面談"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    コード <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light text-sm"
                    placeholder="initial_interview"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">英数字とアンダースコアのみ使用可能</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    所要時間（分）
                  </label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 60 })
                    }
                    min={15}
                    step={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">対象性別</label>
                  <select
                    value={formData.targetGender}
                    onChange={(e) => setFormData({ ...formData, targetGender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light text-sm"
                  >
                    <option value="">共通（性別不問）</option>
                    <option value="1">男性向け</option>
                    <option value="2">女性向け</option>
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
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light text-sm"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-primary focus:ring-cloud-light/50 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    有効
                  </label>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                  disabled={saving}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
                  disabled={saving}
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
