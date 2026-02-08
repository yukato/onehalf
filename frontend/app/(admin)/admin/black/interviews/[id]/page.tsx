'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageLayout } from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { formatDateTime, formatActivityLogDate } from '@/lib/utils';
import type { AdminUser, Interview, InterviewType, InterviewActivityLog, User } from '@/types';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: '予約済み', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '完了', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'キャンセル', color: 'bg-gray-100 text-gray-800' },
  no_show: { label: '無断キャンセル', color: 'bg-red-100 text-red-800' },
};

export default function InterviewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [interviewTypes, setInterviewTypes] = useState<InterviewType[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // アクティビティログ
  const [activityLogs, setActivityLogs] = useState<InterviewActivityLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  // ユーザー検索
  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 編集フォームの状態
  const [formData, setFormData] = useState({
    interviewTypeId: '',
    userId: '' as string | null,
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    scheduledAt: '',
    durationMinutes: 60,
    meetingUrl: '',
    currentStatus: 'scheduled',
  });

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
  }, [router, id]);

  const loadData = async () => {
    try {
      const [interviewData, typesRes] = await Promise.all([
        api.getInterview(id),
        api.getInterviewTypes(),
      ]);
      setInterview(interviewData);
      setInterviewTypes(typesRes.interviewTypes);

      // フォームデータを初期化
      const scheduledAt = new Date(interviewData.scheduledAt);
      setFormData({
        interviewTypeId: interviewData.interviewTypeId,
        userId: interviewData.userId || '',
        guestName: interviewData.guestName,
        guestEmail: interviewData.guestEmail || '',
        guestPhone: interviewData.guestPhone || '',
        scheduledAt: scheduledAt.toISOString().slice(0, 16),
        durationMinutes: interviewData.durationMinutes,
        meetingUrl: interviewData.meetingUrl || '',
        currentStatus: interviewData.currentStatus,
      });

      // 紐付けユーザーがいる場合は選択状態にする
      if (interviewData.user) {
        setSelectedUser({
          id: interviewData.user.id,
          lastName: interviewData.user.lastName,
          firstName: interviewData.user.firstName,
        } as User);
      }

      // アクティビティログは別で取得（失敗してもページは表示）
      try {
        const logsRes = await api.getInterviewActivityLogs(id);
        setActivityLogs(logsRes.logs);
      } catch (err) {
        console.error('Failed to load activity logs:', err);
      }
    } catch (error) {
      console.error('Failed to load interview:', error);
    }
  };

  const searchUsers = async (q: string) => {
    if (!q.trim()) {
      setUserSearchResults([]);
      return;
    }
    try {
      const data = await api.getUsers(q, 20);
      setUserSearchResults(data.users);
    } catch (err) {
      console.error('Failed to search users:', err);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    router.push('/admin/login');
  };

  const handleSave = async () => {
    if (!interview) return;

    try {
      setSaving(true);
      const updated = await api.updateInterview(id, {
        interviewTypeId: formData.interviewTypeId,
        userId: formData.userId || null,
        guestName: formData.guestName,
        guestEmail: formData.guestEmail || undefined,
        guestPhone: formData.guestPhone || undefined,
        scheduledAt: formData.scheduledAt,
        durationMinutes: formData.durationMinutes,
        meetingUrl: formData.meetingUrl || undefined,
        currentStatus: formData.currentStatus as
          | 'scheduled'
          | 'completed'
          | 'cancelled'
          | 'no_show',
      });
      setInterview(updated);
      setEditing(false);
    } catch (error) {
      console.error('Failed to update interview:', error);
      alert('更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('この面談を削除してもよろしいですか？')) return;

    try {
      await api.deleteInterview(id);
      router.push('/admin/black/interviews');
    } catch (error) {
      console.error('Failed to delete interview:', error);
      alert('削除に失敗しました');
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const log = await api.createInterviewActivityLog(id, newComment);
      setActivityLogs([log, ...activityLogs]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    // IME変換中はEnterで送信しない
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmitComment();
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

  if (!interview) {
    return (
      <PageLayout
        currentPage="black-interviews"
        title="面談詳細"
        currentUser={currentUser}
        onLogout={handleLogout}
      >
        <div className="text-center text-gray-500 py-8">面談が見つかりません</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      currentPage="black-interviews"
      title="面談詳細"
      currentUser={currentUser}
      onLogout={handleLogout}
      headerActions={
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 text-sm font-medium rounded-full ${
              STATUS_LABELS[interview.currentStatus]?.color || 'bg-gray-100 text-gray-800'
            }`}
          >
            {STATUS_LABELS[interview.currentStatus]?.label || interview.currentStatus}
          </span>
          {!editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                編集
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-red-600 text-sm border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                削除
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 text-gray-600 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                disabled={saving}
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </>
          )}
        </div>
      }
      backPath="/admin/black/interviews"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基本情報 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  面談種類 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.interviewTypeId}
                  onChange={(e) => setFormData({ ...formData, interviewTypeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  {interviewTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                <select
                  value={formData.currentStatus}
                  onChange={(e) => setFormData({ ...formData, currentStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  予約日時 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">会議URL</label>
                <input
                  type="url"
                  value={formData.meetingUrl}
                  onChange={(e) => setFormData({ ...formData, meetingUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <span className="text-xs text-gray-500">面談種類</span>
                <p className="text-sm text-gray-900">{interview.interviewType?.name || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">予約日時</span>
                <p className="text-lg font-bold text-gray-900">
                  {formatDateTime(interview.scheduledAt)}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">所要時間</span>
                <p className="text-sm text-gray-900">{interview.durationMinutes}分</p>
              </div>
              {interview.meetingUrl && (
                <div>
                  <span className="text-xs text-gray-500">会議URL</span>
                  <p>
                    <a
                      href={interview.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      {interview.meetingUrl}
                    </a>
                  </p>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-500">担当者</span>
                <p className="text-sm text-gray-900">{interview.adminUser?.username || '-'}</p>
              </div>
            </div>
          )}
        </div>

        {/* ゲスト情報 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ゲスト情報</h2>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  紐付けユーザー
                </label>
                {selectedUser ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <span className="font-medium">
                        {selectedUser.lastName} {selectedUser.firstName}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">#{selectedUser.id}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, userId: '' });
                        setSelectedUser(null);
                        setUserSearch('');
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
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        searchUsers(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="名前またはIDで検索..."
                    />
                    {userSearchResults.length > 0 && (
                      <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {userSearchResults.map((user) => (
                          <li key={user.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, userId: user.id });
                                setSelectedUser(user);
                                setUserSearch('');
                                setUserSearchResults([]);
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
                <p className="text-xs text-gray-500 mt-1">
                  ユーザーを紐付けない場合は空欄のままにしてください
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ゲスト名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.guestName}
                  onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={formData.guestEmail}
                  onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                <input
                  type="tel"
                  value={formData.guestPhone}
                  onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <span className="text-xs text-gray-500">ゲスト名</span>
                <p className="text-lg font-bold text-gray-900">{interview.guestName}</p>
              </div>
              {interview.user ? (
                <div>
                  <span className="text-xs text-gray-500">紐付けユーザー</span>
                  <p>
                    <button
                      onClick={() => router.push(`/admin/black/users/${interview.user?.id}`)}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      {interview.user.lastName} {interview.user.firstName}
                    </button>
                  </p>
                </div>
              ) : (
                <div>
                  <span className="text-xs text-gray-500">紐付けユーザー</span>
                  <p className="text-sm text-gray-500">（未設定）</p>
                </div>
              )}
              {interview.guestEmail && (
                <div>
                  <span className="text-xs text-gray-500">メールアドレス</span>
                  <p className="text-sm text-gray-900">{interview.guestEmail}</p>
                </div>
              )}
              {interview.guestPhone && (
                <div>
                  <span className="text-xs text-gray-500">電話番号</span>
                  <p className="text-sm text-gray-900">{interview.guestPhone}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* アクティビティログ */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden lg:col-span-2">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">アクティビティログ</h3>
          </div>
          <div className="p-6">
            {/* ログ一覧 */}
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {activityLogs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">まだログがありません</p>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-xs font-medium">
                        {log.adminUser.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {log.adminUser.username}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatActivityLogDate(log.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{log.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 新規コメント入力 */}
            <div className="border-t border-gray-200 pt-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleCommentKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="コメントを入力..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-400">Shift + Enter で改行、Enter で送信</p>
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmittingComment}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !newComment.trim() || isSubmittingComment
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isSubmittingComment ? '送信中...' : '送信'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
