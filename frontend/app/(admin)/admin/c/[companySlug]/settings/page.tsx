'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ModuleHeader } from '@/components/modules/ModuleHeader';
import type { LlmSettingsResponse, AvailableLlmModel } from '@/types';
import { AVAILABLE_EMBEDDING_MODELS } from '@/types';

type SettingsTab = 'model';

const settingsMenu: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'model', label: 'LLM モデル設定', icon: 'cpu' },
];

const renderIcon = (icon: string) => {
  switch (icon) {
    case 'cpu':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      );
    default:
      return null;
  }
};

export default function AdminCompanySettingsPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SettingsTab>('model');

  const [settings, setSettings] = useState<LlmSettingsResponse | null>(null);
  const [selectedModel, setSelectedModel] = useState<{ provider: string; model: string } | null>(null);
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState('intfloat/multilingual-e5-small');

  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const data = await api.getCompanyLlmSettings(companySlug);
      setSettings(data);
      setSelectedModel({ provider: data.provider, model: data.model });
      setSelectedEmbeddingModel(data.embeddingModel);
      setAnthropicKey('');
      setOpenaiKey('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定の読み込みに失敗しました');
    }
  }, [companySlug]);

  useEffect(() => {
    const init = async () => {
      await loadSettings();
      setIsLoading(false);
    };
    init().catch(console.error);
  }, [companySlug, loadSettings]);

  const handleModelSelect = (model: AvailableLlmModel) => {
    const providerHasKey =
      (model.provider === 'anthropic' && settings?.hasAnthropicKey) ||
      (model.provider === 'openai' && settings?.hasOpenaiKey);
    const providerHasPendingKey =
      (model.provider === 'anthropic' && anthropicKey.trim()) ||
      (model.provider === 'openai' && openaiKey.trim());
    if (!providerHasKey && !providerHasPendingKey) return;
    setSelectedModel({ provider: model.provider, model: model.model });
  };

  const isModelEnabled = (model: AvailableLlmModel) => {
    const providerHasKey =
      (model.provider === 'anthropic' && settings?.hasAnthropicKey) ||
      (model.provider === 'openai' && settings?.hasOpenaiKey);
    const providerHasPendingKey =
      (model.provider === 'anthropic' && anthropicKey.trim()) ||
      (model.provider === 'openai' && openaiKey.trim());
    return providerHasKey || !!providerHasPendingKey;
  };

  const isCurrentModel = (model: AvailableLlmModel) =>
    settings?.provider === model.provider && settings?.model === model.model;

  const isSelectedModel = (model: AvailableLlmModel) =>
    selectedModel?.provider === model.provider && selectedModel?.model === model.model;

  const hasChanges = () => {
    if (!settings || !selectedModel) return false;
    return (
      settings.provider !== selectedModel.provider ||
      settings.model !== selectedModel.model ||
      settings.embeddingModel !== selectedEmbeddingModel ||
      anthropicKey.trim() !== '' ||
      openaiKey.trim() !== ''
    );
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case 'anthropic': return 'Anthropic';
      case 'openai': return 'OpenAI';
      default: return provider;
    }
  };

  const handleSave = async () => {
    if (!selectedModel) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updateData: Record<string, unknown> = {
        provider: selectedModel.provider,
        model: selectedModel.model,
        embeddingModel: selectedEmbeddingModel,
      };
      if (anthropicKey.trim()) updateData.apiKeyAnthropic = anthropicKey.trim();
      if (openaiKey.trim()) updateData.apiKeyOpenai = openaiKey.trim();
      const data = await api.updateCompanyLlmSettings(companySlug, updateData);
      setSettings(data);
      setSelectedModel({ provider: data.provider, model: data.model });
      setSelectedEmbeddingModel(data.embeddingModel);
      setAnthropicKey('');
      setOpenaiKey('');
      setShowAnthropicKey(false);
      setShowOpenaiKey(false);
      setSuccess('設定を保存しました');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ModuleHeader moduleName="設定" icon="settings" />

      <div className="flex gap-6">
        {/* Settings Sidebar */}
        <div className="w-52 flex-shrink-0">
          <nav className="space-y-0.5">
            {settingsMenu.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors ${
                  activeTab === item.id
                    ? 'bg-white text-gray-900 font-medium shadow-sm'
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

        {/* Content */}
        <div className="flex-1">
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

          {settings && (
            <div className="space-y-6">
              {/* API Keys */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">APIキー</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <label className="block text-sm font-medium text-gray-700">Anthropic APIキー</label>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${settings.hasAnthropicKey ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {settings.hasAnthropicKey ? 'APIキー設定済み' : 'APIキー未設定'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showAnthropicKey ? 'text' : 'password'}
                        value={anthropicKey}
                        onChange={(e) => setAnthropicKey(e.target.value)}
                        placeholder={settings.hasAnthropicKey ? '新しいキーで上書き...' : 'sk-ant-...'}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light font-mono"
                      />
                      <button type="button" onClick={() => setShowAnthropicKey(!showAnthropicKey)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showAnthropicKey ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <label className="block text-sm font-medium text-gray-700">OpenAI APIキー</label>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${settings.hasOpenaiKey ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {settings.hasOpenaiKey ? 'APIキー設定済み' : 'APIキー未設定'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showOpenaiKey ? 'text' : 'password'}
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder={settings.hasOpenaiKey ? '新しいキーで上書き...' : 'sk-...'}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light font-mono"
                      />
                      <button type="button" onClick={() => setShowOpenaiKey(!showOpenaiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showOpenaiKey ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* LLM Model */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">LLM モデル設定</h2>
                <p className="text-sm text-gray-600 mb-4">
                  現在のモデル:{' '}
                  <span className="font-medium">
                    {settings.availableModels.find((m) => m.provider === settings.provider && m.model === settings.model)?.name || settings.model}
                  </span>
                </p>
                <div className="space-y-2">
                  {settings.availableModels.map((model) => {
                    const enabled = isModelEnabled(model);
                    return (
                      <label
                        key={`${model.provider}-${model.model}`}
                        className={`flex items-center p-4 rounded-lg border transition-colors ${
                          enabled
                            ? isSelectedModel(model)
                              ? 'border-primary bg-primary-manilla/30 cursor-pointer'
                              : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                            : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                        }`}
                        onClick={() => handleModelSelect(model)}
                      >
                        <input type="radio" name="model" checked={isSelectedModel(model)} disabled={!enabled} onChange={() => handleModelSelect(model)} className="w-4 h-4 text-primary border-gray-300 focus:ring-cloud-light/50" />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${enabled ? 'text-gray-900' : 'text-gray-400'}`}>{model.name}</span>
                            {isCurrentModel(model) && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">使用中</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${model.provider === 'anthropic' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>{getProviderLabel(model.provider)}</span>
                            {!enabled && <span className="text-xs text-gray-400">APIキーが設定されていません</span>}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Embedding Model */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">埋め込みモデル</h2>
                <p className="text-sm text-gray-600 mb-3">書類検索に使用する埋め込みモデルを選択してください。</p>
                <select
                  value={selectedEmbeddingModel}
                  onChange={(e) => setSelectedEmbeddingModel(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light"
                >
                  {AVAILABLE_EMBEDDING_MODELS.map((m) => (
                    <option key={m.model} value={m.model}>{m.name}</option>
                  ))}
                </select>
                <p className="text-amber-600 text-sm mt-2">モデルを変更すると、既存ドキュメントの再処理が必要になります</p>
              </div>

              {/* Save */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">APIキーが設定されているプロバイダーのモデルのみ選択可能です</p>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
