'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { formatActivityLogDate } from '@/lib/utils';
import type { SettingsResponse, ModelInfo, OperationalRule, RuleHistory, AdminUser } from '@/types';

type SettingsTab = 'model' | 'rules';
type ModalMode = 'create' | 'edit' | null;

const settingsMenu = [
  { id: 'model' as const, label: 'LLM モデル設定', icon: 'cpu' },
  { id: 'rules' as const, label: 'FAQ 運用ルール', icon: 'document' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('model');

  // Model settings state
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [selectedModel, setSelectedModel] = useState<{ provider: string; model: string } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Rules state
  const [rules, setRules] = useState<OperationalRule[]>([]);
  const [history, setHistory] = useState<RuleHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingRule, setEditingRule] = useState<OperationalRule | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formTargetMale, setFormTargetMale] = useState(false);
  const [formTargetFemale, setFormTargetFemale] = useState(false);
  const [isRuleSaving, setIsRuleSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      setSelectedModel({ provider: data.current.provider, model: data.current.model });
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定の読み込みに失敗しました');
    }
  }, []);

  const loadRules = useCallback(async () => {
    try {
      const response = await api.getRules();
      setRules(response.rules);
    } catch (err) {
      console.error('Failed to load rules:', err);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const response = await api.getRuleHistory();
      setHistory(response.history);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (api.getAccessToken()) {
        setIsAuthenticated(true);
        setCurrentUser(api.getCurrentUser());
        await Promise.all([loadSettings(), loadRules(), loadHistory()]);
        setIsLoading(false);
        return;
      }

      try {
        await api.refresh();
        const user = await api.getMe();
        setCurrentUser(user);
        setIsAuthenticated(true);
        await Promise.all([loadSettings(), loadRules(), loadHistory()]);
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, loadSettings, loadRules, loadHistory]);

  const handleSave = async () => {
    if (!selectedModel) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await api.updateSettings(selectedModel);
      setSettings(data);
      setSuccess('設定を保存しました');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    router.push('/admin/login');
  };

  const handleModelSelect = (model: ModelInfo) => {
    if (!model.enabled) return;
    setSelectedModel({ provider: model.provider, model: model.model });
  };

  const isCurrentModel = (model: ModelInfo) => {
    return settings?.current.provider === model.provider && settings?.current.model === model.model;
  };

  const isSelectedModel = (model: ModelInfo) => {
    return selectedModel?.provider === model.provider && selectedModel?.model === model.model;
  };

  const hasChanges = () => {
    if (!settings || !selectedModel) return false;
    return (
      settings.current.provider !== selectedModel.provider ||
      settings.current.model !== selectedModel.model
    );
  };

  // Rules handlers
  const openCreateModal = () => {
    setModalMode('create');
    setEditingRule(null);
    setFormTitle('');
    setFormContent('');
    setFormEnabled(true);
    setFormTargetMale(false);
    setFormTargetFemale(false);
    setError(null);
  };

  const openEditModal = (rule: OperationalRule) => {
    setModalMode('edit');
    setEditingRule(rule);
    setFormTitle(rule.title);
    setFormContent(rule.content);
    setFormEnabled(rule.enabled);
    setFormTargetMale(rule.target_gender?.includes('male') ?? false);
    setFormTargetFemale(rule.target_gender?.includes('female') ?? false);
    setError(null);
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingRule(null);
    setFormTitle('');
    setFormContent('');
    setFormEnabled(true);
    setFormTargetMale(false);
    setFormTargetFemale(false);
  };

  // Helper to build target_gender array from checkboxes
  const buildTargetGender = (): string[] | null => {
    const genders: string[] = [];
    if (formTargetMale) genders.push('male');
    if (formTargetFemale) genders.push('female');
    return genders.length > 0 ? genders : null;
  };

  // Helper to display target gender
  const getTargetGenderLabel = (targetGender: string[] | null): string => {
    if (!targetGender || targetGender.length === 0) return '未設定';
    const labels: string[] = [];
    if (targetGender.includes('male')) labels.push('男性');
    if (targetGender.includes('female')) labels.push('女性');
    return labels.join('・');
  };

  const handleRuleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      setError('タイトルと内容は必須です');
      return;
    }

    const targetGender = buildTargetGender();

    setIsRuleSaving(true);
    setError(null);

    try {
      if (modalMode === 'create') {
        await api.createRule({
          title: formTitle.trim(),
          content: formContent.trim(),
          enabled: formEnabled,
          target_gender: targetGender,
        });
        setSuccess('ルールを作成しました');
      } else if (modalMode === 'edit' && editingRule) {
        await api.updateRule(editingRule.id, {
          title: formTitle.trim(),
          content: formContent.trim(),
          enabled: formEnabled,
          target_gender: targetGender,
        });
        setSuccess('ルールを更新しました');
      }
      closeModal();
      await loadRules();
      await loadHistory();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsRuleSaving(false);
    }
  };

  const handleToggleEnabled = async (rule: OperationalRule) => {
    try {
      await api.updateRule(rule.id, { enabled: !rule.enabled });
      setSuccess(rule.enabled ? 'ルールを無効化しました' : 'ルールを有効化しました');
      await loadRules();
      await loadHistory();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    }
  };

  const handleDelete = async (ruleId: string) => {
    try {
      await api.deleteRule(ruleId);
      setSuccess('ルールを削除しました');
      setDeleteConfirm(null);
      await loadRules();
      await loadHistory();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };


  const getRuleActionLabel = (action: string) => {
    switch (action) {
      case 'create':
        return '作成';
      case 'update':
        return '更新';
      case 'delete':
        return '削除';
      case 'enable':
        return '有効化';
      case 'disable':
        return '無効化';
      default:
        return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-700';
      case 'delete':
        return 'bg-red-100 text-red-700';
      case 'enable':
        return 'bg-blue-100 text-blue-700';
      case 'disable':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case 'anthropic':
        return 'Anthropic';
      case 'openai':
        return 'OpenAI';
      default:
        return provider;
    }
  };

  const renderIcon = (icon: string) => {
    switch (icon) {
      case 'cpu':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
            />
          </svg>
        );
      case 'document':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      default:
        return null;
    }
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
      currentPage="settings"
      title="設定"
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      <div className="flex h-full bg-gray-50 -mr-4 -mb-4 -mt-4 overflow-hidden">
        {/* Settings Sidebar */}
        <div className="w-52 bg-gray-50 py-4 flex-shrink-0">
          <nav className="space-y-0.5 px-3">
            {settingsMenu.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors ${
                  activeTab === item.id
                    ? 'bg-white text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                }`}
              >
                <span className={activeTab === item.id ? 'text-gray-600' : 'text-gray-400'}>
                  {renderIcon(item.icon)}
                </span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-6xl">
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

            {/* LLM Model Settings Tab */}
            {activeTab === 'model' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">LLM モデル設定</h2>

                {settings && (
                  <>
                    <p className="text-sm text-gray-600 mb-4">
                      現在のモデル:{' '}
                      <span className="font-medium">
                        {settings.available_models.find(
                          (m) =>
                            m.provider === settings.current.provider &&
                            m.model === settings.current.model
                        )?.name || settings.current.model}
                      </span>
                    </p>

                    <div className="space-y-2">
                      {settings.available_models.map((model) => (
                        <label
                          key={`${model.provider}-${model.model}`}
                          className={`flex items-center p-4 rounded-lg border transition-colors ${
                            model.enabled
                              ? isSelectedModel(model)
                                ? 'border-primary bg-primary-manilla/30 cursor-pointer'
                                : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                              : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                          }`}
                          onClick={() => handleModelSelect(model)}
                        >
                          <input
                            type="radio"
                            name="model"
                            checked={isSelectedModel(model)}
                            disabled={!model.enabled}
                            onChange={() => handleModelSelect(model)}
                            className="w-4 h-4 text-primary border-gray-300 focus:ring-primary/50"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-medium ${model.enabled ? 'text-gray-900' : 'text-gray-400'}`}
                              >
                                {model.name}
                              </span>
                              {isCurrentModel(model) && (
                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                  使用中
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  model.provider === 'anthropic'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {getProviderLabel(model.provider)}
                              </span>
                              {!model.enabled && (
                                <span className="text-xs text-gray-400">
                                  APIキーが設定されていません
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        環境変数が設定されているモデルのみ選択可能です
                      </p>
                      <button
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges()}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isSaving || !hasChanges()
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-primary text-white hover:bg-primary-dark'
                        }`}
                      >
                        {isSaving ? '保存中...' : '保存'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Operational Rules Tab */}
            {activeTab === 'rules' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">FAQ 運用ルール</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      FAQチャットボットのシステムプロンプトに追加されるルールを管理します
                    </p>
                  </div>
                  <button
                    onClick={openCreateModal}
                    className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    新規追加
                  </button>
                </div>

                {/* Rules List */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ルール名
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                          対象
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                          状態
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
                          更新日
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {rules.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                            ルールがありません
                          </td>
                        </tr>
                      ) : (
                        rules.map((rule) => (
                          <tr key={rule.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">{rule.title}</div>
                              <div className="text-xs text-gray-500 truncate max-w-md mt-0.5">
                                {rule.content.substring(0, 60)}...
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  !rule.target_gender || rule.target_gender.length === 0
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {getTargetGenderLabel(rule.target_gender)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleToggleEnabled(rule)}
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                  rule.enabled
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {rule.enabled ? '有効' : '無効'}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-500">
                              {formatActivityLogDate(rule.updated_at)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => openEditModal(rule)}
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
                                  onClick={() => setDeleteConfirm(rule.id)}
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* History Section */}
                <div className="mt-6">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-90' : ''}`}
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
                    変更履歴を表示
                  </button>

                  {showHistory && (
                    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        {history.length === 0 ? (
                          <div className="px-4 py-6 text-center text-gray-500 text-sm">
                            履歴がありません
                          </div>
                        ) : (
                          <ul className="divide-y divide-gray-100">
                            {history.slice(0, 30).map((item) => {
                              const rule = rules.find((r) => r.id === item.rule_id);
                              const ruleTitle =
                                rule?.title ||
                                item.changes?.title?.new ||
                                item.changes?.title?.old ||
                                '(削除済み)';
                              return (
                                <li
                                  key={item.id}
                                  className="px-4 py-3 flex items-center gap-3 text-sm"
                                >
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(item.action)}`}
                                  >
                                    {getRuleActionLabel(item.action)}
                                  </span>
                                  <span className="text-gray-900 flex-1">{ruleTitle}</span>
                                  <span className="text-gray-400 text-xs">
                                    {formatActivityLogDate(item.timestamp)}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-12 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4 mb-12 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {modalMode === 'create' ? '新規ルール作成' : 'ルール編集'}
              </h2>
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

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                    placeholder="例: 違反報告への誘導ルール"
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    内容（マークダウン対応）
                  </label>
                  <textarea
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm font-mono"
                    rows={18}
                    placeholder="ルールの内容を入力してください..."
                    maxLength={5000}
                  />
                  <div className="mt-1 text-xs text-gray-500 text-right">
                    {formContent.length} / 5000
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    対象会員 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formTargetMale}
                        onChange={(e) => setFormTargetMale(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/50"
                      />
                      <span className="text-sm text-gray-700">男性会員</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formTargetFemale}
                        onChange={(e) => setFormTargetFemale(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/50"
                      />
                      <span className="text-sm text-gray-700">女性会員</span>
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    選択した会員向けのチャットボットにのみこのルールが適用されます
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={formEnabled}
                    onChange={(e) => setFormEnabled(e.target.checked)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/50"
                  />
                  <label htmlFor="enabled" className="text-sm text-gray-700">
                    有効にする（チャットボットのプロンプトに反映）
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                キャンセル
              </button>
              <button
                onClick={handleRuleSave}
                disabled={isRuleSaving || !formTitle.trim() || !formContent.trim()}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isRuleSaving || !formTitle.trim() || !formContent.trim()
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary-dark'
                }`}
              >
                {isRuleSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">ルールを削除</h3>
            <p className="text-sm text-gray-600 mb-4">
              このルールを削除してもよろしいですか？この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
