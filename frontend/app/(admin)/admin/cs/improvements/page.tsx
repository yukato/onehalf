'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import type { ImprovementSuggestion, ArticleDraft, AdminUser } from '@/types';

export default function ImprovementsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  // State
  const [suggestions, setSuggestions] = useState<ImprovementSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ImprovementSuggestion | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<ArticleDraft | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSuggestions = useCallback(async () => {
    try {
      const response = await api.getImprovementSuggestions(statusFilter || undefined);
      setSuggestions(response.suggestions);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    }
  }, [statusFilter]);

  useEffect(() => {
    const checkAuth = async () => {
      if (api.getAccessToken()) {
        setIsAuthenticated(true);
        setCurrentUser(api.getCurrentUser());
        await loadSuggestions();
        setIsLoading(false);
        return;
      }

      try {
        await api.refresh();
        const user = await api.getMe();
        setCurrentUser(user);
        setIsAuthenticated(true);
        await loadSuggestions();
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, loadSuggestions]);

  // Reload suggestions when filter changes
  useEffect(() => {
    if (isAuthenticated) {
      loadSuggestions();
    }
  }, [statusFilter, isAuthenticated, loadSuggestions]);

  const handleLogout = async () => {
    await api.logout();
    router.push('/admin/login');
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await api.analyzeForImprovements({ days: 7, min_occurrences: 2 });
      setSuggestions(response.suggestions);
      if (response.suggestions.length > 0) {
        setSuccess(`${response.suggestions.length}件の改善提案を生成しました`);
      } else {
        setSuccess('新しい改善提案はありませんでした');
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析に失敗しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStatusChange = async (
    suggestionId: string,
    newStatus: 'pending' | 'in_progress' | 'resolved' | 'dismissed'
  ) => {
    try {
      await api.updateSuggestionStatus(suggestionId, newStatus);
      await loadSuggestions();
      setSuccess('ステータスを更新しました');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ステータス更新に失敗しました');
    }
  };

  const handleGenerateDraft = async (suggestionId: string) => {
    setIsGeneratingDraft(true);
    setError(null);
    try {
      const draft = await api.generateArticleDraft(suggestionId);
      setCurrentDraft(draft);
      setShowDraftModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '下書き生成に失敗しました');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleCopyDraft = () => {
    if (currentDraft) {
      navigator.clipboard.writeText(currentDraft.content);
      setSuccess('下書きをコピーしました');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '未対応';
      case 'in_progress':
        return '対応中';
      case 'resolved':
        return '対応済み';
      case 'dismissed':
        return '却下';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getSuggestionActionLabel = (action: string) => {
    switch (action) {
      case 'create_new':
        return '新規作成';
      case 'update_existing':
        return '既存更新';
      case 'add_examples':
        return '例を追加';
      default:
        return action;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  return (
    <PageLayout
      currentPage="improvements"
      title="ナレッジ改善レコメンド"
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      <div>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">
                AIが自動で回答品質を評価し、ヘルプ記事の改善提案を生成します
              </p>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                isAnalyzing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  分析中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  分析を実行
                </>
              )}
            </button>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm text-gray-600">フィルタ:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">すべて</option>
              <option value="pending">未対応</option>
              <option value="in_progress">対応中</option>
              <option value="resolved">対応済み</option>
              <option value="dismissed">却下</option>
            </select>
          </div>

          {/* Suggestions Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    トピック
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    発生数
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    確信度
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    状態
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {suggestions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                      改善提案がありません。「分析を実行」をクリックしてチャットログを分析してください。
                    </td>
                  </tr>
                ) : (
                  suggestions.map((suggestion) => (
                    <tr
                      key={suggestion.id}
                      className={`hover:bg-gray-50 cursor-pointer ${selectedSuggestion?.id === suggestion.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedSuggestion(suggestion)}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{suggestion.topic}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {getSuggestionActionLabel(suggestion.suggested_action)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                        {suggestion.occurrence_count}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-sm font-medium ${
                            suggestion.avg_confidence < 0.4
                              ? 'text-red-600'
                              : suggestion.avg_confidence < 0.6
                                ? 'text-yellow-600'
                                : 'text-green-600'
                          }`}
                        >
                          {(suggestion.avg_confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(suggestion.status)}`}
                        >
                          {getStatusLabel(suggestion.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateDraft(suggestion.id);
                          }}
                          disabled={isGeneratingDraft}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                        >
                          下書き
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Selected Suggestion Details */}
          {selectedSuggestion && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">{selectedSuggestion.topic}</h3>

              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">サンプル質問:</span>
                  <ul className="mt-1 space-y-1">
                    {selectedSuggestion.sample_questions.map((q, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-gray-400">•</span>
                        <span>「{q}」</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">
                    提案アクション:{' '}
                    <span className="font-medium text-gray-900">
                      {getSuggestionActionLabel(selectedSuggestion.suggested_action)}
                    </span>
                  </span>
                  <span className="text-gray-500">
                    作成日:{' '}
                    <span className="font-medium text-gray-900">
                      {formatDate(selectedSuggestion.created_at)}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleGenerateDraft(selectedSuggestion.id)}
                    disabled={isGeneratingDraft}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      isGeneratingDraft
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isGeneratingDraft ? '生成中...' : '下書きを生成'}
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedSuggestion.id, 'resolved')}
                    className="px-3 py-1.5 text-sm font-medium text-green-700 hover:text-green-800"
                  >
                    対応済みにする
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedSuggestion.id, 'dismissed')}
                    className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    却下
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Article Draft Modal */}
      {showDraftModal && currentDraft && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-12 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 mb-12 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                ナレッジ下書き: {currentDraft.title}
              </h2>
              <button
                onClick={() => {
                  setShowDraftModal(false);
                  setCurrentDraft(null);
                }}
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

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
                  <input
                    type="text"
                    value={currentDraft.title}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">本文</label>
                  <textarea
                    value={currentDraft.content}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                    rows={20}
                  />
                </div>

                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    参考にした質問:
                  </span>
                  <ul className="mt-1 space-y-1">
                    {currentDraft.source_questions.map((q, i) => (
                      <li key={i} className="text-sm text-gray-700">
                        • {q}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCopyDraft}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                コピー
              </button>
              <button
                onClick={() => {
                  setShowDraftModal(false);
                  setCurrentDraft(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
