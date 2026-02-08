'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { MatchingExtractorModal } from '@/components/MatchingExtractorModal';
import { formatDateTime } from '@/lib/utils';
import type {
  AdminUser,
  Matching,
  MatchingStatusCode,
  CreateMatchingRequest,
  User,
  MatchingVenue,
} from '@/types';

// ステータスの定義
const MATCHING_STATUSES: { code: MatchingStatusCode; label: string }[] = [
  { code: 'pending', label: '調整中' },
  { code: 'confirmed', label: '確定' },
  { code: 'completed', label: '完了' },
  { code: 'cancelled', label: 'キャンセル' },
];

// ステータスコード→ラベル
function getStatusLabel(status: MatchingStatusCode): string {
  return MATCHING_STATUSES.find((s) => s.code === status)?.label || status;
}

// ステータスの色
function getStatusColor(status: MatchingStatusCode): string {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}


// 年齢を計算
function calculateAge(birthday: string | null | undefined): number | null {
  if (!birthday) return null;
  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function MatchingsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [matchings, setMatchings] = useState<Matching[]>([]);
  const [total, setTotal] = useState(0);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ビュー切替
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // カレンダー用
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [calendarMatchings, setCalendarMatchings] = useState<Matching[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // フィルタ
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterFromDate, setFilterFromDate] = useState<string>('');
  const [filterToDate, setFilterToDate] = useState<string>('');
  const [filterQuery, setFilterQuery] = useState<string>(''); // ユーザー検索
  const [offset, setOffset] = useState(0);
  const limit = 50;

  // モーダル
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<CreateMatchingRequest>({
    maleUserId: '',
    femaleUserId: '',
    startAt: '',
    endAt: '',
    venueId: '',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ユーザー・待合せ場所検索
  const [maleUsers, setMaleUsers] = useState<User[]>([]);
  const [femaleUsers, setFemaleUsers] = useState<User[]>([]);
  const [venues, setVenues] = useState<MatchingVenue[]>([]);
  const [maleSearch, setMaleSearch] = useState('');
  const [femaleSearch, setFemaleSearch] = useState('');
  // 選択されたユーザー情報を保持
  const [selectedMale, setSelectedMale] = useState<User | null>(null);
  const [selectedFemale, setSelectedFemale] = useState<User | null>(null);

  // 削除確認
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingMatching, setDeletingMatching] = useState<Matching | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // AI抽出モーダル
  const [showExtractorModal, setShowExtractorModal] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (api.getAccessToken()) {
        setIsAuthenticated(true);
        setCurrentUser(api.getCurrentUser());
        await loadMatchings();
        setIsLoading(false);
        return;
      }

      try {
        await api.refresh();
        setIsAuthenticated(true);
        const user = await api.getMe();
        setCurrentUser(user);
        await loadMatchings();
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadMatchings = async (
    filters?: { status?: string; fromDate?: string; toDate?: string; q?: string },
    newOffset?: number
  ) => {
    try {
      const currentFilters = filters ?? {
        status: filterStatus,
        fromDate: filterFromDate,
        toDate: filterToDate,
        q: filterQuery,
      };
      const data = await api.getMatchings(currentFilters, limit, newOffset ?? offset);
      setMatchings(data.matchings);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matchings');
    }
  };

  // カレンダー月のマッチングをロード
  const loadCalendarMatchings = async (date: Date) => {
    try {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const fromDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const toDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

      const data = await api.getMatchings({ fromDate, toDate }, 200, 0);
      setCalendarMatchings(data.matchings);
    } catch (err) {
      console.error('Failed to load calendar matchings:', err);
    }
  };

  // カレンダー表示時にデータをロード
  const handleViewModeChange = async (mode: 'list' | 'calendar') => {
    setViewMode(mode);
    if (mode === 'calendar') {
      await loadCalendarMatchings(calendarDate);
    }
  };

  // カレンダー月変更
  const handleCalendarMonthChange = async (direction: 'prev' | 'next') => {
    const newDate = new Date(calendarDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCalendarDate(newDate);
    setSelectedDate(null);
    await loadCalendarMatchings(newDate);
  };

  // ステータスの並び順（完了 → 確定 → 調整中 → キャンセル）
  const STATUS_ORDER: Record<MatchingStatusCode, number> = {
    completed: 0,
    confirmed: 1,
    pending: 2,
    cancelled: 3,
  };

  // 日付ごとのマッチングを取得（ステータス順 → 時間順でソート）
  const getMatchingsForDate = (dateStr: string): Matching[] => {
    return calendarMatchings
      .filter((m) => {
        const matchDate = new Date(m.startAt).toISOString().split('T')[0];
        return matchDate === dateStr;
      })
      .sort((a, b) => {
        // まずステータス順
        const statusDiff = STATUS_ORDER[a.currentStatus] - STATUS_ORDER[b.currentStatus];
        if (statusDiff !== 0) return statusDiff;
        // 同じステータスなら開始時間順
        return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
      });
  };

  // カレンダーの日付配列を生成（月曜始まり）
  const generateCalendarDays = (): (Date | null)[] => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // 日曜=0 → 月曜始まりでは6、月曜=1 → 0、火曜=2 → 1 ...
    const startDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days: (Date | null)[] = [];

    // 前月の空白
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // 当月の日付
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const loadVenues = async () => {
    try {
      const data = await api.getVenues('', true);
      setVenues(data.venues);
    } catch (err) {
      console.error('Failed to load venues:', err);
    }
  };

  const searchMaleUsers = async (q: string) => {
    if (!q.trim()) {
      setMaleUsers([]);
      return;
    }
    try {
      const data = await api.getUsers(q, 20, 0, false, { gender: '1', status: 'approved' });
      setMaleUsers(data.users);
    } catch (err) {
      console.error('Failed to search male users:', err);
    }
  };

  const searchFemaleUsers = async (q: string) => {
    if (!q.trim()) {
      setFemaleUsers([]);
      return;
    }
    try {
      const data = await api.getUsers(q, 20, 0, false, { gender: '2', status: 'approved' });
      setFemaleUsers(data.users);
    } catch (err) {
      console.error('Failed to search female users:', err);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    router.push('/admin/login');
  };

  const openCreateModal = async () => {
    // デフォルト日時を設定（明日の18:00-20:00）
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    const startAt = tomorrow.toISOString().slice(0, 16);
    tomorrow.setHours(20, 0, 0, 0);
    const endAt = tomorrow.toISOString().slice(0, 16);

    setFormData({
      maleUserId: '',
      femaleUserId: '',
      startAt,
      endAt,
      venueId: '',
      notes: '',
    });
    setMaleSearch('');
    setFemaleSearch('');
    setMaleUsers([]);
    setFemaleUsers([]);
    setSelectedMale(null);
    setSelectedFemale(null);
    setFormError(null);
    await loadVenues();
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
      await api.createMatching({
        maleUserId: formData.maleUserId,
        femaleUserId: formData.femaleUserId,
        startAt: formData.startAt,
        endAt: formData.endAt,
        venueId: formData.venueId || undefined,
        notes: formData.notes || undefined,
      });
      closeModal();
      await loadMatchings();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (matching: Matching) => {
    setDeletingMatching(matching);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMatching) return;

    setIsDeleting(true);
    try {
      await api.deleteMatching(deletingMatching.id);
      setShowDeleteConfirm(false);
      setDeletingMatching(null);
      await loadMatchings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    loadMatchings(undefined, newOffset);
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
      currentPage="black-matchings"
      title="マッチング"
      currentUser={currentUser}
      onLogout={handleLogout}
      headerActions={
        <div className="flex items-center gap-2">
          {/* ビュー切替 */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => handleViewModeChange('list')}
              className={`px-3 py-1.5 text-sm transition-colors ${
                viewMode === 'list'
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </button>
            <button
              onClick={() => handleViewModeChange('calendar')}
              className={`px-3 py-1.5 text-sm transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>

          <button
            onClick={() => setShowExtractorModal(true)}
            className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            AIで作成
          </button>

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
        {/* フィルタ（リストビュー時のみ） */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">ユーザー検索</label>
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setOffset(0);
                      loadMatchings(
                        {
                          status: filterStatus,
                          fromDate: filterFromDate,
                          toDate: filterToDate,
                          q: filterQuery,
                        },
                        0
                      );
                    }
                  }}
                  placeholder="名前で検索..."
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">ステータス</label>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setOffset(0);
                    loadMatchings(
                      {
                        status: e.target.value,
                        fromDate: filterFromDate,
                        toDate: filterToDate,
                        q: filterQuery,
                      },
                      0
                    );
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">すべて</option>
                  {MATCHING_STATUSES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">開始日（から）</label>
                <input
                  type="date"
                  value={filterFromDate}
                  onChange={(e) => {
                    setFilterFromDate(e.target.value);
                    setOffset(0);
                    loadMatchings(
                      {
                        status: filterStatus,
                        fromDate: e.target.value,
                        toDate: filterToDate,
                        q: filterQuery,
                      },
                      0
                    );
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">開始日（まで）</label>
                <input
                  type="date"
                  value={filterToDate}
                  onChange={(e) => {
                    setFilterToDate(e.target.value);
                    setOffset(0);
                    loadMatchings(
                      {
                        status: filterStatus,
                        fromDate: filterFromDate,
                        toDate: e.target.value,
                        q: filterQuery,
                      },
                      0
                    );
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {(filterStatus || filterFromDate || filterToDate || filterQuery) && (
                <button
                  onClick={() => {
                    setFilterStatus('');
                    setFilterFromDate('');
                    setFilterToDate('');
                    setFilterQuery('');
                    setOffset(0);
                    loadMatchings({ status: '', fromDate: '', toDate: '', q: '' }, 0);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  クリア
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        )}

        {viewMode === 'list' ? (
          <>
            {/* Stats */}
            <div className="text-sm text-gray-500">
              {total} 件中 {offset + 1} - {Math.min(offset + limit, total)} 件を表示
            </div>

            {/* Matchings table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 tracking-wider w-14">
                      #
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                      日時
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      男性会員
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      女性会員
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      待合せ場所
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      ステータス
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {matchings.map((matching) => (
                    <tr
                      key={matching.id}
                      onClick={() => router.push(`/admin/black/matchings/${matching.id}`)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">
                        #{matching.id}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                        <div>{formatDateTime(matching.startAt)}</div>
                        <div>{formatDateTime(matching.endAt)}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {matching.maleUser.profileImageUrl ? (
                            <img
                              src={matching.maleUser.profileImageUrl}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-600 text-xs font-medium">
                                {matching.maleUser.lastName?.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm text-gray-900">
                              {matching.maleUser.lastName} {matching.maleUser.firstName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {calculateAge(matching.maleUser.birthday) !== null &&
                                `${calculateAge(matching.maleUser.birthday)}歳`}
                              {matching.maleUser.occupation &&
                                ` / ${matching.maleUser.occupation.name}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {matching.femaleUser.profileImageUrl ? (
                            <img
                              src={matching.femaleUser.profileImageUrl}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-pink-600 text-xs font-medium">
                                {matching.femaleUser.lastName?.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm text-gray-900">
                              {matching.femaleUser.lastName} {matching.femaleUser.firstName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {calculateAge(matching.femaleUser.birthday) !== null &&
                                `${calculateAge(matching.femaleUser.birthday)}歳`}
                              {matching.femaleUser.occupation &&
                                ` / ${matching.femaleUser.occupation.name}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {matching.venue ? (
                          <div>
                            <div className="text-sm text-gray-900">{matching.venue.name}</div>
                            <div className="text-xs text-gray-500">{matching.venue.genre}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">未設定</span>
                        )}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-center">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(matching.currentStatus)}`}
                        >
                          {getStatusLabel(matching.currentStatus)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {matchings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        マッチングが見つかりません
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
          </>
        ) : (
          /* カレンダービュー */
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* カレンダーヘッダー */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => handleCalendarMonthChange('prev')}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <h3 className="text-lg font-semibold text-gray-900">
                {calendarDate.getFullYear()}年{calendarDate.getMonth() + 1}月
              </h3>
              <button
                onClick={() => handleCalendarMonthChange('next')}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* 曜日ヘッダー（月曜始まり） */}
            <div className="grid grid-cols-7 border-b border-gray-200">
              {['月', '火', '水', '木', '金', '土', '日'].map((day, i) => (
                <div
                  key={day}
                  className={`px-2 py-2 text-center text-xs font-medium ${
                    i === 6 ? 'text-red-500' : i === 5 ? 'text-blue-500' : 'text-gray-500'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* カレンダー本体 */}
            <div className="grid grid-cols-7">
              {generateCalendarDays().map((date, index) => {
                if (!date) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="h-40 border-b border-r border-gray-100 bg-gray-50"
                    />
                  );
                }

                const dateStr = date.toISOString().split('T')[0];
                const dayMatchings = getMatchingsForDate(dateStr);
                const isToday = new Date().toDateString() === date.toDateString();
                const isSelected = selectedDate === dateStr;
                const dayOfWeek = date.getDay(); // 0=日, 6=土

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`h-40 border-b border-r border-gray-100 p-1.5 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isToday
                          ? 'w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center'
                          : dayOfWeek === 0
                            ? 'text-red-500'
                            : dayOfWeek === 6
                              ? 'text-blue-500'
                              : 'text-gray-900'
                      }`}
                    >
                      {date.getDate()}
                    </div>
                    {dayMatchings.length > 0 && (
                      <div className="space-y-1">
                        {dayMatchings.slice(0, 3).map((m) => (
                          <div
                            key={m.id}
                            className={`text-xs px-1 py-0.5 rounded truncate ${
                              m.currentStatus === 'confirmed'
                                ? 'bg-green-100 text-green-800'
                                : m.currentStatus === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : m.currentStatus === 'completed'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {new Date(m.startAt).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            {m.maleUser.lastName}×{m.femaleUser.lastName}
                          </div>
                        ))}
                        {dayMatchings.length > 3 && (
                          <div className="text-xs text-gray-500 px-1">
                            +{dayMatchings.length - 3}件
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 選択日のマッチング詳細モーダル */}
        {selectedDate &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[100] overflow-y-auto"
              onClick={() => setSelectedDate(null)}
            >
              <div
                className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 mt-12 mb-12"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {new Date(selectedDate).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                    })}{' '}
                    のマッチング
                  </h3>
                  <button
                    onClick={() => setSelectedDate(null)}
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
                <div className="p-6">
                  {getMatchingsForDate(selectedDate).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      この日のマッチングはありません
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {getMatchingsForDate(selectedDate).map((m) => (
                        <div
                          key={m.id}
                          onClick={() => router.push(`/admin/black/matchings/${m.id}`)}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-sm font-medium text-gray-900 w-28">
                              {new Date(m.startAt).toLocaleTimeString('ja-JP', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              -{' '}
                              {new Date(m.endAt).toLocaleTimeString('ja-JP', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className="flex items-center gap-3">
                              {/* 男性会員 - 固定幅 */}
                              <div className="flex items-center gap-2 w-36">
                                {m.maleUser.profileImageUrl ? (
                                  <img
                                    src={m.maleUser.profileImageUrl}
                                    alt=""
                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-blue-600 text-xs font-medium">
                                      {m.maleUser.lastName?.charAt(0)}
                                    </span>
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {m.maleUser.lastName} {m.maleUser.firstName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {calculateAge(m.maleUser.birthday) !== null &&
                                      `${calculateAge(m.maleUser.birthday)}歳`}
                                  </div>
                                </div>
                              </div>
                              <span className="text-gray-400 text-lg flex-shrink-0">×</span>
                              {/* 女性会員 - 固定幅 */}
                              <div className="flex items-center gap-2 w-36">
                                {m.femaleUser.profileImageUrl ? (
                                  <img
                                    src={m.femaleUser.profileImageUrl}
                                    alt=""
                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-pink-600 text-xs font-medium">
                                      {m.femaleUser.lastName?.charAt(0)}
                                    </span>
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {m.femaleUser.lastName} {m.femaleUser.firstName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {calculateAge(m.femaleUser.birthday) !== null &&
                                      `${calculateAge(m.femaleUser.birthday)}歳`}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {m.venue && (
                              <div className="text-xs text-gray-500 text-right">
                                <div>{m.venue.name}</div>
                                {m.venue.city && (
                                  <div className="text-gray-400">{m.venue.city}</div>
                                )}
                              </div>
                            )}
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full text-center w-20 flex-shrink-0 ${getStatusColor(m.currentStatus)}`}
                            >
                              {getStatusLabel(m.currentStatus)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>

      {/* Create Modal */}
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
              <h2 className="text-lg font-semibold text-gray-900">新規マッチング作成</h2>
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

                {/* 男性会員 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    男性会員 <span className="text-red-500">*</span>
                  </label>
                  {selectedMale ? (
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div>
                        <span className="font-medium">
                          {selectedMale.lastName} {selectedMale.firstName}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">#{selectedMale.id}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, maleUserId: '' });
                          setSelectedMale(null);
                          setMaleSearch('');
                        }}
                        className="text-gray-400 hover:text-gray-600"
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={maleSearch}
                        onChange={(e) => {
                          setMaleSearch(e.target.value);
                          searchMaleUsers(e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="名前またはIDで検索..."
                      />
                      {maleUsers.length > 0 && (
                        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {maleUsers.map((user) => (
                            <li key={user.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, maleUserId: user.id });
                                  setSelectedMale(user);
                                  setMaleSearch('');
                                  setMaleUsers([]);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                              >
                                {user.lastName} {user.firstName}
                                <span className="text-gray-500 ml-2">#{user.id}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* 女性会員 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    女性会員 <span className="text-red-500">*</span>
                  </label>
                  {selectedFemale ? (
                    <div className="flex items-center justify-between p-3 bg-pink-50 border border-pink-200 rounded-lg">
                      <div>
                        <span className="font-medium">
                          {selectedFemale.lastName} {selectedFemale.firstName}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">#{selectedFemale.id}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, femaleUserId: '' });
                          setSelectedFemale(null);
                          setFemaleSearch('');
                        }}
                        className="text-gray-400 hover:text-gray-600"
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={femaleSearch}
                        onChange={(e) => {
                          setFemaleSearch(e.target.value);
                          searchFemaleUsers(e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="名前またはIDで検索..."
                      />
                      {femaleUsers.length > 0 && (
                        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {femaleUsers.map((user) => (
                            <li key={user.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, femaleUserId: user.id });
                                  setSelectedFemale(user);
                                  setFemaleSearch('');
                                  setFemaleUsers([]);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                              >
                                {user.lastName} {user.firstName}
                                <span className="text-gray-500 ml-2">#{user.id}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* 日時 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      開始日時 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.startAt}
                      onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      終了日時 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endAt}
                      onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                    />
                  </div>
                </div>

                {/* 待合せ場所 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">待合せ場所</label>
                  <select
                    value={formData.venueId || ''}
                    onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">未設定</option>
                    {venues.map((venue) => (
                      <option key={venue.id} value={venue.id}>
                        {venue.name} {venue.genre ? `(${venue.genre})` : ''}{' '}
                        {venue.city ? `- ${venue.city}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* メモ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    rows={3}
                    placeholder="特記事項など"
                  />
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
                    !formData.maleUserId ||
                    !formData.femaleUserId ||
                    !formData.startAt ||
                    !formData.endAt
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isSaving ||
                    !formData.maleUserId ||
                    !formData.femaleUserId ||
                    !formData.startAt ||
                    !formData.endAt
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isSaving ? '作成中...' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingMatching && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">削除の確認</h3>
            <p className="text-sm text-gray-600 mb-6">
              {deletingMatching.maleUser.lastName} {deletingMatching.maleUser.firstName} ×{' '}
              {deletingMatching.femaleUser.lastName} {deletingMatching.femaleUser.firstName}{' '}
              のマッチングを削除しますか？
              <br />
              <span className="text-red-600">この操作は取り消せません。</span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                disabled={isDeleting}
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? '削除中...' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Matching Extractor Modal */}
      <MatchingExtractorModal
        isOpen={showExtractorModal}
        onClose={() => setShowExtractorModal(false)}
        onApply={async (data) => {
          await api.createMatching(data);
          await loadMatchings();
        }}
      />
    </PageLayout>
  );
}
