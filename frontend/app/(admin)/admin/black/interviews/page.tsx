'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import type { AdminUser, Interview, InterviewType, CreateInterviewRequest } from '@/types';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: '予約済み', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '完了', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'キャンセル', color: 'bg-gray-100 text-gray-800' },
  no_show: { label: '無断キャンセル', color: 'bg-red-100 text-red-800' },
};

type ViewMode = 'list' | 'calendar';

export default function InterviewsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [interviewTypes, setInterviewTypes] = useState<InterviewType[]>([]);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // フィルター
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // カレンダー用
  const [calendarInterviews, setCalendarInterviews] = useState<Interview[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // モーダル
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<CreateInterviewRequest>({
    interviewTypeId: '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    scheduledAt: '',
    durationMinutes: 60,
    meetingUrl: '',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // TimeRexインポートモーダル
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTypeId, setImportTypeId] = useState('');
  const [importSince, setImportSince] = useState('');
  const [importUntil, setImportUntil] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    stats?: { fetched: number; created: number; updated: number; unchanged: number; errors: number };
  } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (api.getAccessToken()) {
        setIsAuthenticated(true);
        setCurrentUser(api.getCurrentUser());
        setIsLoading(false);
        return;
      }

      try {
        await api.refresh();
        setIsAuthenticated(true);
        const user = await api.getMe();
        setCurrentUser(user);
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadInterviews = useCallback(async () => {
    try {
      const filters: {
        status?: string;
        typeId?: string;
        fromDate?: string;
        toDate?: string;
        q?: string;
      } = {};

      if (statusFilter) filters.status = statusFilter;
      if (typeFilter) filters.typeId = typeFilter;
      if (fromDate) filters.fromDate = fromDate;
      if (toDate) filters.toDate = toDate;
      if (searchQuery) filters.q = searchQuery;

      const [interviewsRes, typesRes] = await Promise.all([
        api.getInterviews(filters, 100, 0),
        api.getInterviewTypes(),
      ]);

      setInterviews(interviewsRes.interviews);
      setTotal(interviewsRes.total);
      setInterviewTypes(typesRes.interviewTypes);
    } catch (error) {
      console.error('Failed to load interviews:', error);
    }
  }, [statusFilter, typeFilter, fromDate, toDate, searchQuery]);

  // カレンダー月の面談をロード
  const loadCalendarInterviews = async (date: Date) => {
    try {
      const year = date.getFullYear();
      const month = date.getMonth();
      const lastDay = new Date(year, month + 1, 0);

      const fromDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const toDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

      const data = await api.getInterviews({ fromDate: fromDateStr, toDate: toDateStr }, 200, 0);
      setCalendarInterviews(data.interviews);
    } catch (err) {
      console.error('Failed to load calendar interviews:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadInterviews();
    }
  }, [isAuthenticated, loadInterviews]);

  const handleLogout = async () => {
    await api.logout();
    router.push('/admin/login');
  };

  const handleViewModeChange = async (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'calendar') {
      await loadCalendarInterviews(currentMonth);
    }
  };

  const handleCalendarMonthChange = async (direction: 'prev' | 'next') => {
    const newDate = new Date(currentMonth);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentMonth(newDate);
    setSelectedDate(null);
    await loadCalendarInterviews(newDate);
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const w = weekdays[date.getDay()];
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} (${w}) ${h}:${min}`;
  };

  const getGuestDisplayName = (interview: Interview) => {
    if (interview.user) {
      return `${interview.user.lastName} ${interview.user.firstName}`;
    }
    return interview.guestName;
  };

  // カレンダー用のヘルパー関数
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: (Date | null)[] = [];

    // 月曜始まりに調整（日曜=0 → 6, 月曜=1 → 0, ...）
    const startDayOfWeek = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  const getInterviewsForDate = (dateStr: string) => {
    return calendarInterviews.filter((interview) => {
      const interviewDate = new Date(interview.scheduledAt).toISOString().split('T')[0];
      return interviewDate === dateStr;
    });
  };

  // モーダル関連
  const openCreateModal = async () => {
    // デフォルト日時を設定（明日の10:00）
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const scheduledAt = tomorrow.toISOString().slice(0, 16);

    const firstType = interviewTypes.find((t) => t.isActive) || interviewTypes[0];

    setFormData({
      interviewTypeId: firstType?.id || '',
      guestName: '',
      guestEmail: '',
      guestPhone: '',
      scheduledAt,
      durationMinutes: firstType?.durationMinutes || 60,
      meetingUrl: '',
      notes: '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError(null);
  };

  const handleTypeChange = (typeId: string) => {
    const type = interviewTypes.find((t) => t.id === typeId);
    setFormData((prev) => ({
      ...prev,
      interviewTypeId: typeId,
      durationMinutes: type?.durationMinutes || 60,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      await api.createInterview({
        interviewTypeId: formData.interviewTypeId,
        guestName: formData.guestName.trim(),
        guestEmail: formData.guestEmail?.trim() || undefined,
        guestPhone: formData.guestPhone?.trim() || undefined,
        scheduledAt: formData.scheduledAt,
        durationMinutes: formData.durationMinutes,
        meetingUrl: formData.meetingUrl?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
      });
      closeModal();
      await loadInterviews();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '作成に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // TimeRexインポート
  const openImportModal = () => {
    const firstType = interviewTypes.find((t) => t.isActive) || interviewTypes[0];
    setImportTypeId(firstType?.id || '');

    // デフォルト期間: 30日前〜30日後
    const now = new Date();
    const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    setImportSince(since.toISOString().split('T')[0]);
    setImportUntil(until.toISOString().split('T')[0]);

    setImportResult(null);
    setShowImportModal(true);
  };

  const handleImport = async () => {
    if (!importTypeId) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await api.importInterviewsFromTimeRex(
        importTypeId,
        importSince || undefined,
        importUntil || undefined
      );
      setImportResult(result);
      if (result.success) {
        await loadInterviews();
      }
    } catch (err) {
      setImportResult({
        success: false,
        message: err instanceof Error ? err.message : 'インポートに失敗しました',
      });
    } finally {
      setIsImporting(false);
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

  const calendarDays = generateCalendarDays();

  return (
    <PageLayout
      currentPage="black-interviews"
      title="面談管理"
      currentUser={currentUser}
      onLogout={handleLogout}
      showBackButton={false}
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
            onClick={() => router.push('/admin/black/interview-types')}
            className="px-3 py-1.5 text-gray-600 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            種類マスタ
          </button>

          <button
            onClick={openImportModal}
            className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            TimeRex取込
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
        {/* フィルター（リストビュー時のみ） */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">検索</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ゲスト名・メール"
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">ステータス</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">すべて</option>
                  {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">面談種類</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">すべて</option>
                  {interviewTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">開始日（から）</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">開始日（まで）</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {(statusFilter || typeFilter || fromDate || toDate || searchQuery) && (
                <button
                  onClick={() => {
                    setStatusFilter('');
                    setTypeFilter('');
                    setFromDate('');
                    setToDate('');
                    setSearchQuery('');
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  クリア
                </button>
              )}
            </div>
          </div>
        )}

        {viewMode === 'list' ? (
          <>
            {/* Stats */}
            <div className="text-sm text-gray-500">{total} 件</div>

            {/* Interviews table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      予約日時
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      面談種類
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ゲスト
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      会議URL
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {interviews.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        面談がありません
                      </td>
                    </tr>
                  ) : (
                    interviews.map((interview) => (
                      <tr
                        key={interview.id}
                        onClick={() => router.push(`/admin/black/interviews/${interview.id}`)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatDateTime(interview.scheduledAt)}
                          <span className="ml-2 text-gray-500">
                            ({interview.durationMinutes}分)
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                          {interview.interviewType?.name || '-'}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {getGuestDisplayName(interview)}
                          </div>
                          {interview.guestEmail && (
                            <div className="text-xs text-gray-500">{interview.guestEmail}</div>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              STATUS_LABELS[interview.currentStatus]?.color ||
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {STATUS_LABELS[interview.currentStatus]?.label ||
                              interview.currentStatus}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm">
                          {interview.meetingUrl && (
                            <a
                              href={interview.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              開く
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
                {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
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
              {calendarDays.map((date, index) => {
                if (!date) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="h-32 border-b border-r border-gray-100 bg-gray-50"
                    />
                  );
                }

                const dateStr = date.toISOString().split('T')[0];
                const dayInterviews = getInterviewsForDate(dateStr);
                const isToday = new Date().toDateString() === date.toDateString();
                const isSelected = selectedDate === dateStr;
                const dayOfWeek = date.getDay();

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`h-32 border-b border-r border-gray-100 p-1.5 cursor-pointer transition-colors ${
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
                    {dayInterviews.length > 0 && (
                      <div className="space-y-1">
                        {dayInterviews.slice(0, 3).map((interview) => (
                          <div
                            key={interview.id}
                            className={`text-xs px-1 py-0.5 rounded truncate ${
                              STATUS_LABELS[interview.currentStatus]?.color || 'bg-gray-100'
                            }`}
                          >
                            {new Date(interview.scheduledAt).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            {getGuestDisplayName(interview)}
                          </div>
                        ))}
                        {dayInterviews.length > 3 && (
                          <div className="text-xs text-gray-500 px-1">
                            +{dayInterviews.length - 3}件
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 選択日の面談詳細 */}
            {selectedDate && (
              <div className="border-t border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  {new Date(selectedDate).toLocaleDateString('ja-JP', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                  })}{' '}
                  の面談
                </h4>
                {getInterviewsForDate(selectedDate).length === 0 ? (
                  <p className="text-sm text-gray-500">この日の面談はありません</p>
                ) : (
                  <div className="space-y-2">
                    {getInterviewsForDate(selectedDate).map((interview) => (
                      <div
                        key={interview.id}
                        onClick={() => router.push(`/admin/black/interviews/${interview.id}`)}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(interview.scheduledAt).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="text-sm text-gray-700">
                            {getGuestDisplayName(interview)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {interview.interviewType?.name}（{interview.durationMinutes}分）
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_LABELS[interview.currentStatus]?.color || 'bg-gray-100'}`}
                        >
                          {STATUS_LABELS[interview.currentStatus]?.label || interview.currentStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-12 overflow-y-auto"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 mb-12 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">新規面談作成</h2>
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

                {/* 面談種類 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    面談種類 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.interviewTypeId}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  >
                    <option value="">選択してください</option>
                    {interviewTypes
                      .filter((t) => t.isActive)
                      .map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}（{type.durationMinutes}分）
                        </option>
                      ))}
                  </select>
                </div>

                {/* ゲスト名 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ゲスト名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.guestName}
                    onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="山田 太郎"
                    required
                  />
                </div>

                {/* メールアドレス */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={formData.guestEmail || ''}
                    onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="example@example.com"
                  />
                </div>

                {/* 電話番号 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                  <input
                    type="tel"
                    value={formData.guestPhone || ''}
                    onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="090-1234-5678"
                  />
                </div>

                {/* 予約日時 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    予約日時 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  />
                </div>

                {/* 所要時間 */}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                {/* 会議URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">会議URL</label>
                  <input
                    type="url"
                    value={formData.meetingUrl || ''}
                    onChange={(e) => setFormData({ ...formData, meetingUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="https://zoom.us/j/..."
                  />
                </div>

                {/* メモ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    rows={3}
                    placeholder="面談に関するメモ..."
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
                    !formData.interviewTypeId ||
                    !formData.guestName ||
                    !formData.scheduledAt
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isSaving ||
                    !formData.interviewTypeId ||
                    !formData.guestName ||
                    !formData.scheduledAt
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

      {/* TimeRexインポートモーダル */}
      {showImportModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowImportModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">TimeRexからインポート</h2>
              <button
                onClick={() => setShowImportModal(false)}
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
            <div className="p-6 space-y-4">
              {importResult && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    importResult.success
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <p className="font-medium">{importResult.message}</p>
                  {importResult.stats && (
                    <div className="mt-2 text-xs space-y-1">
                      <p>取得: {importResult.stats.fetched}件</p>
                      <p>新規作成: {importResult.stats.created}件</p>
                      <p>更新: {importResult.stats.updated}件</p>
                      <p>変更なし: {importResult.stats.unchanged}件</p>
                      {importResult.stats.errors > 0 && (
                        <p className="text-red-600">エラー: {importResult.stats.errors}件</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  面談種類 <span className="text-red-500">*</span>
                </label>
                <select
                  value={importTypeId}
                  onChange={(e) => setImportTypeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                  disabled={isImporting}
                >
                  <option value="">選択してください</option>
                  {interviewTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  インポートする予約に割り当てる面談種類を選択
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
                  <input
                    type="date"
                    value={importSince}
                    onChange={(e) => setImportSince(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    disabled={isImporting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
                  <input
                    type="date"
                    value={importUntil}
                    onChange={(e) => setImportUntil(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    disabled={isImporting}
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                disabled={isImporting}
              >
                閉じる
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting || !importTypeId}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isImporting || !importTypeId
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {isImporting ? 'インポート中...' : 'インポート実行'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
