'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { generateUUID } from '@/lib/utils';
import type { UserInputLog, LoginLog, Message, AdminUser } from '@/types';

type TabType = 'chat' | 'login';
type LogType = 'all' | 'faq' | 'internal';

const LOG_TYPE_LABELS: Record<LogType, string> = {
  all: 'すべて',
  faq: 'FAQ',
  internal: '内部サポート',
};

const LOG_TYPE_COLORS: Record<string, string> = {
  faq: 'bg-blue-100 text-blue-700',
  internal: 'bg-green-100 text-green-700',
  unknown: 'bg-gray-100 text-gray-600',
};

const LOG_TYPE_ROUTES: Record<string, string> = {
  faq: '/admin/cs/faq',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  login: 'ログイン',
  logout: 'ログアウト',
  refresh: 'トークン更新',
  login_failed: 'ログイン失敗',
};

export default function HistoryPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  // Chat logs state
  const [chatLogs, setChatLogs] = useState<UserInputLog[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatDays, setChatDays] = useState(7);
  const [logType, setLogType] = useState<LogType>('all');
  const [isChatFetching, setIsChatFetching] = useState(false);

  // Login logs state
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginDays, setLoginDays] = useState(7);
  const [isLoginFetching, setIsLoginFetching] = useState(false);
  const [selectedLoginLog, setSelectedLoginLog] = useState<LoginLog | null>(null);

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
        const user = await api.getMe();
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'chat') {
      fetchChatLogs();
    }
  }, [isAuthenticated, chatDays, logType, activeTab]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'login') {
      fetchLoginLogs();
    }
  }, [isAuthenticated, loginDays, activeTab]);

  const fetchChatLogs = async () => {
    setIsChatFetching(true);
    setChatError(null);
    try {
      const response = await api.getUserInputLogs(
        chatDays,
        logType === 'all' ? undefined : logType,
        200
      );
      if (response.error) {
        setChatError(response.error);
      } else if (response.message) {
        setChatError(response.message);
        setChatLogs([]);
      } else {
        setChatLogs(response.logs);
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'ログの取得に失敗しました');
    } finally {
      setIsChatFetching(false);
    }
  };

  const fetchLoginLogs = async () => {
    setIsLoginFetching(true);
    setLoginError(null);
    try {
      const response = await api.getLoginLogs(loginDays, 200);
      if (response.error) {
        setLoginError(response.error);
      } else if (response.message) {
        setLoginError(response.message);
        setLoginLogs([]);
      } else {
        setLoginLogs(response.logs);
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'ログイン履歴の取得に失敗しました');
    } finally {
      setIsLoginFetching(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    router.push('/admin/login');
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      // バックエンドはUTCで記録するが、'Z'サフィックスがないためJSTとして解釈されてしまう
      // 'Z'を追加してUTCとして明示的に扱う
      const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
      const date = new Date(utcTimestamp);
      return date.toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return timestamp;
    }
  };

  const truncateQuery = (query: string, maxLength: number = 100) => {
    if (query.length <= maxLength) return query;
    return query.slice(0, maxLength) + '...';
  };

  const truncateUserAgent = (ua: string, maxLength: number = 60) => {
    if (ua.length <= maxLength) return ua;
    return ua.slice(0, maxLength) + '...';
  };

  const handleChatLogClick = (log: UserInputLog) => {
    const messages: Message[] = [];

    messages.push({
      id: log.message_id || generateUUID(),
      role: 'user',
      content: log.query,
      timestamp: new Date(log.timestamp),
    });

    if (log.answer) {
      messages.push({
        id: generateUUID(),
        role: 'assistant',
        content: log.answer,
        timestamp: new Date(log.timestamp),
        duration: log.duration_ms,
      });
    }

    localStorage.setItem(
      'restoreChat',
      JSON.stringify({
        messages,
        type: log.type,
        category: log.category,
        timestamp: Date.now(),
      })
    );

    const route = LOG_TYPE_ROUTES[log.type] || '/admin/cs/faq';
    router.push(`${route}?restore=true`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const tabContent = (
    <>
      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'chat'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          チャット履歴
        </button>
        <button
          onClick={() => setActiveTab('login')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'login'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          ログイン履歴
        </button>
      </div>

      {/* Chat History Tab */}
      {activeTab === 'chat' && (
        <>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">期間:</label>
              <select
                value={chatDays}
                onChange={(e) => setChatDays(Number(e.target.value))}
                className="text-sm pl-3 pr-8 py-1 rounded-md border border-gray-300 bg-white text-gray-700"
              >
                <option value={1}>1日</option>
                <option value={3}>3日</option>
                <option value={7}>7日</option>
                <option value={14}>14日</option>
                <option value={30}>30日</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">タイプ:</label>
              <select
                value={logType}
                onChange={(e) => setLogType(e.target.value as LogType)}
                className="text-sm pl-3 pr-8 py-1 rounded-md border border-gray-300 bg-white text-gray-700"
              >
                {Object.entries(LOG_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-500">
              {isChatFetching ? '読み込み中...' : `${chatLogs.length}件`}
            </div>
          </div>

          {chatError && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
              {chatError}
            </div>
          )}

          <div className="flex-1 overflow-auto bg-white rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">日時</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-28">タイプ</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-28">操作者</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">クエリ</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600 w-16">回答</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {chatLogs.map((log, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleChatLogClick(log)}
                  >
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          LOG_TYPE_COLORS[log.type] || LOG_TYPE_COLORS.unknown
                        }`}
                      >
                        {LOG_TYPE_LABELS[log.type as LogType] || log.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {log.admin_username || '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      <div className="hover:text-blue-600 transition-colors">
                        {truncateQuery(log.query, 120)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {log.answer ? (
                        <svg
                          className="w-4 h-4 text-green-500 inline-block"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {chatLogs.length === 0 && !isChatFetching && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                      ログがありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Login History Tab */}
      {activeTab === 'login' && (
        <>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">期間:</label>
              <select
                value={loginDays}
                onChange={(e) => setLoginDays(Number(e.target.value))}
                className="text-sm pl-3 pr-8 py-1 rounded-md border border-gray-300 bg-white text-gray-700"
              >
                <option value={1}>1日</option>
                <option value={3}>3日</option>
                <option value={7}>7日</option>
                <option value={14}>14日</option>
                <option value={30}>30日</option>
              </select>
            </div>
            <div className="text-sm text-gray-500">
              {isLoginFetching ? '読み込み中...' : `${loginLogs.length}件`}
            </div>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
              {loginError}
            </div>
          )}

          <div className="flex-1 overflow-auto bg-white rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">日時</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-28">イベント</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-28">ユーザー</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-32">IPアドレス</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-36">場所</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">User-Agent</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600 w-16">結果</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loginLogs.map((log, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedLoginLog(log)}
                  >
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          log.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {EVENT_TYPE_LABELS[log.event_type] || log.event_type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {log.admin_username || '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-500 font-mono text-xs">{log.ip_address}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">
                      {log.city && log.country ? `${log.city}, ${log.country}` : log.country || '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-xs" title={log.user_agent}>
                      {truncateUserAgent(log.user_agent, 30)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {log.success ? (
                        <svg
                          className="w-4 h-4 text-green-500 inline-block"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 text-red-500 inline-block"
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
                      )}
                    </td>
                  </tr>
                ))}
                {loginLogs.length === 0 && !isLoginFetching && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                      ログイン履歴がありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Login Detail Modal */}
      {selectedLoginLog && (
        <div
          className="fixed inset-0 bg-black/40 flex items-start justify-center pt-12 z-50 overflow-y-auto"
          onClick={() => setSelectedLoginLog(null)}
        >
          <div
            className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 max-w-lg w-full mx-4 mb-12"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">ログイン詳細</h3>
              <button
                onClick={() => setSelectedLoginLog(null)}
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

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">日時</span>
                <span className="text-gray-900">{formatTimestamp(selectedLoginLog.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">イベント</span>
                <span className={selectedLoginLog.success ? 'text-green-600' : 'text-red-600'}>
                  {EVENT_TYPE_LABELS[selectedLoginLog.event_type] || selectedLoginLog.event_type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Basic認証ユーザー</span>
                <span className="text-gray-900">{selectedLoginLog.username}</span>
              </div>
              {selectedLoginLog.admin_username && (
                <div className="flex justify-between">
                  <span className="text-gray-500">管理者ユーザー</span>
                  <span className="text-gray-900">{selectedLoginLog.admin_username}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">結果</span>
                <span className={selectedLoginLog.success ? 'text-green-600' : 'text-red-600'}>
                  {selectedLoginLog.success ? '成功' : '失敗'}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="text-gray-600 mb-2">接続情報</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">IPアドレス</span>
                    <span className="text-gray-900 font-mono text-xs">
                      {selectedLoginLog.ip_address}
                    </span>
                  </div>
                  {selectedLoginLog.isp && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">ISP</span>
                      <span className="text-gray-900">{selectedLoginLog.isp}</span>
                    </div>
                  )}
                </div>
              </div>

              {(selectedLoginLog.country || selectedLoginLog.city) && (
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="text-gray-600 mb-2">位置情報</div>
                  <div className="space-y-2">
                    {selectedLoginLog.country && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">国</span>
                        <span className="text-gray-900">
                          {selectedLoginLog.country}
                          {selectedLoginLog.country_code && ` (${selectedLoginLog.country_code})`}
                        </span>
                      </div>
                    )}
                    {selectedLoginLog.region && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">地域</span>
                        <span className="text-gray-900">{selectedLoginLog.region}</span>
                      </div>
                    )}
                    {selectedLoginLog.city && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">都市</span>
                        <span className="text-gray-900">{selectedLoginLog.city}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="text-gray-600 mb-2">User-Agent</div>
                <div className="text-gray-700 text-xs bg-gray-50 p-2 rounded break-all">
                  {selectedLoginLog.user_agent}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <PageLayout
      currentPage="history"
      title="履歴"
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {tabContent}
    </PageLayout>
  );
}
