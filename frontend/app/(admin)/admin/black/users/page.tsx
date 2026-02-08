'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { formatActivityLogDate } from '@/lib/utils';
import type {
  AdminUser,
  User,
  CreateUserRequest,
  Occupation,
  Plan,
  Prefecture,
  UserStatusCode,
} from '@/types';

// ステータスの定義
const USER_STATUSES: { code: UserStatusCode; label: string }[] = [
  { code: 'pending', label: '審査中' },
  { code: 'approved', label: '承認済' },
  { code: 'withdrawn', label: '退会済' },
  { code: 'suspended', label: '停止中' },
];

// ステータスコード→ラベル
function getStatusLabel(status: UserStatusCode): string {
  return USER_STATUSES.find((s) => s.code === status)?.label || status;
}

// ステータスの色
function getStatusColor(status: UserStatusCode): string {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'withdrawn':
      return 'bg-gray-100 text-gray-800';
    case 'suspended':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// 性別の表示
function getGenderLabel(gender: number): string {
  return gender === 1 ? '男性' : gender === 2 ? '女性' : '不明';
}

// 年齢計算
function calculateAge(birthday: string | null): number | null {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function UsersPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [prefectures, setPrefectures] = useState<Prefecture[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 検索・フィルタ
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPlan, setFilterPlan] = useState<string>('');
  const [filterPrefecture, setFilterPrefecture] = useState<string>('');
  const [filterOccupation, setFilterOccupation] = useState<string>('');
  const [filterScore, setFilterScore] = useState<string>('');
  const [filterAge, setFilterAge] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const limit = 100;

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<CreateUserRequest>({
    bdUserId: '',
    lastName: '',
    firstName: '',
    gender: 1,
    email: '',
    score: 100,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: { row: number; bdUserId: string; error: string }[];
  } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (api.getAccessToken()) {
        setIsAuthenticated(true);
        setCurrentUser(api.getCurrentUser());
        await Promise.all([loadUsers(), loadOccupations(), loadPlans(), loadPrefectures()]);
        setIsLoading(false);
        return;
      }

      try {
        await api.refresh();
        setIsAuthenticated(true);
        const user = await api.getMe();
        setCurrentUser(user);
        await Promise.all([loadUsers(), loadOccupations(), loadPlans(), loadPrefectures()]);
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadUsers = async (
    q?: string,
    newOffset?: number,
    filters?: {
      gender?: string;
      status?: string;
      planId?: string;
      prefectureId?: string;
      occupationId?: string;
      score?: string;
      age?: string;
    }
  ) => {
    try {
      const currentFilters = filters ?? {
        gender: filterGender,
        status: filterStatus,
        planId: filterPlan,
        prefectureId: filterPrefecture,
        occupationId: filterOccupation,
        score: filterScore,
        age: filterAge,
      };
      const data = await api.getUsers(
        q ?? searchQuery,
        limit,
        newOffset ?? offset,
        false,
        currentFilters
      );
      setUsers(data.users);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    }
  };

  const loadOccupations = async () => {
    try {
      const data = await api.getOccupations();
      setOccupations(data.occupations);
    } catch (err) {
      console.error('Failed to load occupations:', err);
    }
  };

  const loadPlans = async () => {
    try {
      const data = await api.getPlans();
      setPlans(data.plans);
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  const loadPrefectures = async () => {
    try {
      const data = await api.getPrefectures();
      setPrefectures(data);
    } catch (err) {
      console.error('Failed to load prefectures:', err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    loadUsers(searchQuery, 0);
  };

  const handleLogout = async () => {
    await api.logout();
    router.push('/admin/login');
  };

  const openCreateModal = () => {
    setFormData({
      bdUserId: '',
      lastName: '',
      firstName: '',
      gender: 1,
      email: '',
      score: 100,
    });
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      await api.createUser(formData);
      closeModal();
      await loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    loadUsers(searchQuery, newOffset);
  };

  // CSV Export
  const handleExport = async (type: 'data' | 'template') => {
    try {
      const blob = await api.exportUsersCSV(type);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        type === 'template'
          ? 'users_template.csv'
          : `users_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  // CSV Import
  const handleImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await api.importUsersCSV(importFile);
      setImportResult(result);
      if (result.success > 0) {
        await loadUsers();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportResult(null);
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

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <PageLayout
      currentPage="black-users"
      title="ユーザー管理"
      currentUser={currentUser}
      onLogout={handleLogout}
      headerActions={
        <div className="flex items-center gap-2">
          {/* エクスポートメニュー */}
          <div className="relative group">
            <button className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              エクスポート
            </button>
            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('data')}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
              >
                データをエクスポート
              </button>
              <button
                onClick={() => handleExport('template')}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
              >
                テンプレートをダウンロード
              </button>
            </div>
          </div>

          {/* インポートボタン */}
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            インポート
          </button>

          {/* 新規作成ボタン */}
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
        </div>
      }
    >
      <div className="space-y-4">
        {/* 検索・フィルタ */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="名前、メール、BD User IDで検索..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              検索
            </button>
          </form>

          {/* フィルタ */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filterGender}
              onChange={(e) => {
                const val = e.target.value;
                setFilterGender(val);
                setOffset(0);
                loadUsers(searchQuery, 0, {
                  gender: val,
                  status: filterStatus,
                  planId: filterPlan,
                  prefectureId: filterPrefecture,
                  occupationId: filterOccupation,
                  score: filterScore,
                  age: filterAge,
                });
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">性別: すべて</option>
              <option value="1">男性</option>
              <option value="2">女性</option>
            </select>

            <select
              value={filterAge}
              onChange={(e) => {
                const val = e.target.value;
                setFilterAge(val);
                setOffset(0);
                loadUsers(searchQuery, 0, {
                  gender: filterGender,
                  status: filterStatus,
                  planId: filterPlan,
                  prefectureId: filterPrefecture,
                  occupationId: filterOccupation,
                  score: filterScore,
                  age: val,
                });
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">年齢: すべて</option>
              <option value="20-24">20-24歳</option>
              <option value="25-29">25-29歳</option>
              <option value="30-34">30-34歳</option>
              <option value="35-39">35-39歳</option>
              <option value="40-44">40-44歳</option>
              <option value="45-49">45-49歳</option>
              <option value="50+">50歳以上</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => {
                const val = e.target.value;
                setFilterStatus(val);
                setOffset(0);
                loadUsers(searchQuery, 0, {
                  gender: filterGender,
                  status: val,
                  planId: filterPlan,
                  prefectureId: filterPrefecture,
                  occupationId: filterOccupation,
                  score: filterScore,
                  age: filterAge,
                });
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">ステータス: すべて</option>
              {USER_STATUSES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </select>

            <select
              value={filterPlan}
              onChange={(e) => {
                const val = e.target.value;
                setFilterPlan(val);
                setOffset(0);
                loadUsers(searchQuery, 0, {
                  gender: filterGender,
                  status: filterStatus,
                  planId: val,
                  prefectureId: filterPrefecture,
                  occupationId: filterOccupation,
                  score: filterScore,
                  age: filterAge,
                });
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">プラン: すべて</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id.toString()}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={filterPrefecture}
              onChange={(e) => {
                const val = e.target.value;
                setFilterPrefecture(val);
                setOffset(0);
                loadUsers(searchQuery, 0, {
                  gender: filterGender,
                  status: filterStatus,
                  planId: filterPlan,
                  prefectureId: val,
                  occupationId: filterOccupation,
                  score: filterScore,
                  age: filterAge,
                });
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">都道府県: すべて</option>
              {prefectures.map((p) => (
                <option key={p.id} value={p.id.toString()}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={filterOccupation}
              onChange={(e) => {
                const val = e.target.value;
                setFilterOccupation(val);
                setOffset(0);
                loadUsers(searchQuery, 0, {
                  gender: filterGender,
                  status: filterStatus,
                  planId: filterPlan,
                  prefectureId: filterPrefecture,
                  occupationId: val,
                  score: filterScore,
                  age: filterAge,
                });
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">職業: すべて</option>
              {occupations.map((o) => (
                <option key={o.id} value={o.id.toString()}>
                  {o.name}
                </option>
              ))}
            </select>

            <select
              value={filterScore}
              onChange={(e) => {
                const val = e.target.value;
                setFilterScore(val);
                setOffset(0);
                loadUsers(searchQuery, 0, {
                  gender: filterGender,
                  status: filterStatus,
                  planId: filterPlan,
                  prefectureId: filterPrefecture,
                  occupationId: filterOccupation,
                  score: val,
                  age: filterAge,
                });
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">スコア: すべて</option>
              <option value="100">100</option>
              <option value="90-99">90-99</option>
              <option value="80-89">80-89</option>
              <option value="70-79">70-79</option>
              <option value="60-69">60-69</option>
              <option value="0-59">59以下</option>
            </select>

            {(filterGender ||
              filterStatus ||
              filterPlan ||
              filterPrefecture ||
              filterOccupation ||
              filterScore ||
              filterAge) && (
              <button
                onClick={() => {
                  setFilterGender('');
                  setFilterStatus('');
                  setFilterPlan('');
                  setFilterPrefecture('');
                  setFilterOccupation('');
                  setFilterScore('');
                  setFilterAge('');
                  setOffset(0);
                  loadUsers(searchQuery, 0, {
                    gender: '',
                    status: '',
                    planId: '',
                    prefectureId: '',
                    occupationId: '',
                    score: '',
                    age: '',
                  });
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                クリア
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="text-sm text-gray-500">
          {total} 件中 {offset + 1} - {Math.min(offset + limit, total)} 件を表示
        </div>

        {/* Users table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  名前
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  性別/年齢
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  都道府県
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  職業
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  プラン
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  スコア
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  登録日時
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => {
                const age = calculateAge(user.birthday);
                return (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/admin/black/users/${user.id}`)}
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      #{user.id}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {user.profileImageUrl ? (
                          <img
                            src={user.profileImageUrl}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              user.gender === 1
                                ? 'bg-blue-100'
                                : user.gender === 2
                                  ? 'bg-pink-100'
                                  : 'bg-gray-100'
                            }`}
                          >
                            <span
                              className={`text-xs font-medium ${
                                user.gender === 1
                                  ? 'text-blue-600'
                                  : user.gender === 2
                                    ? 'text-pink-600'
                                    : 'text-gray-600'
                              }`}
                            >
                              {user.lastName?.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.lastName} {user.firstName}
                          </div>
                          <div className="text-xs text-gray-500">{user.mobileNumber || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                          user.gender === 1
                            ? 'bg-blue-100 text-blue-700'
                            : user.gender === 2
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {getGenderLabel(user.gender)}
                      </span>
                      {age !== null && <span className="text-gray-500 ml-1">/ {age}歳</span>}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.prefecture?.name || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.occupation?.name || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.plan?.name || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.currentStatus)}`}
                      >
                        {getStatusLabel(user.currentStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`font-medium ${
                          user.score >= 90
                            ? 'text-green-600'
                            : user.score >= 70
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {user.score}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt
                        ? formatActivityLogDate(user.createdAt)
                        : '-'}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    ユーザーが見つかりません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => handlePageChange(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              前へ
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(offset + limit)}
              disabled={offset + limit >= total}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              次へ
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-12 overflow-y-auto"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 mb-12 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">新規ユーザー</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
                aria-label="閉じる"
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
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      BD User ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.bdUserId}
                      onChange={(e) => setFormData({ ...formData, bdUserId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      性別 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData({ ...formData, gender: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value={1}>男性</option>
                      <option value={2}>女性</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      姓 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="山田"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="太郎"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                    <input
                      type="tel"
                      value={formData.mobileNumber || ''}
                      onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">生年月日</label>
                    <input
                      type="date"
                      value={formData.birthday || ''}
                      onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">職業</label>
                    <select
                      value={formData.occupationId || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          occupationId: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">選択してください</option>
                      {occupations.map((occ) => (
                        <option key={occ.id} value={occ.id}>
                          {occ.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">都道府県</label>
                    <select
                      value={formData.prefectureId || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prefectureId: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">選択してください</option>
                      {prefectures.map((pref) => (
                        <option key={pref.id} value={pref.id}>
                          {pref.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">プラン</label>
                    <select
                      value={formData.planId || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          planId: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">選択してください</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ステータス
                    </label>
                    <select
                      value={formData.currentStatus || 'pending'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentStatus: e.target.value as UserStatusCode,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      {USER_STATUSES.map((status) => (
                        <option key={status.code} value={status.code}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">スコア</label>
                  <select
                    value={formData.score ?? 100}
                    onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    {Array.from({ length: 101 }, (_, i) => 100 - i).map((score) => (
                      <option key={score} value={score}>
                        {score}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    !formData.bdUserId ||
                    !formData.lastName ||
                    !formData.firstName ||
                    !formData.email
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isSaving ||
                    !formData.bdUserId ||
                    !formData.lastName ||
                    !formData.firstName ||
                    !formData.email
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isSaving ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeImportModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">CSVインポート</h3>
              <button onClick={closeImportModal} className="text-gray-400 hover:text-gray-600">
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

            {!importResult ? (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    CSVファイルを選択してインポートします。
                  </p>
                  <button
                    onClick={() => handleExport('template')}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    テンプレートをダウンロード
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CSVファイル
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={closeImportModal}
                    className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!importFile || isImporting}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      !importFile || isImporting
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isImporting ? 'インポート中...' : 'インポート'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-medium">{importResult.success}</span>
                      <span className="text-sm text-gray-600">件成功</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 font-medium">{importResult.failed}</span>
                      <span className="text-sm text-gray-600">件失敗</span>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="max-h-40 overflow-y-auto">
                      <p className="text-sm font-medium text-gray-700 mb-2">エラー詳細:</p>
                      <ul className="text-sm text-red-600 space-y-1">
                        {importResult.errors.map((err, idx) => (
                          <li key={idx}>
                            行 {err.row}: BD ID {err.bdUserId} - {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={closeImportModal}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    閉じる
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
