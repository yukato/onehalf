'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { ExtractedProfileValue, ExtractedBasicInfo } from '@/types';

interface ExtractionResult {
  basicInfo: ExtractedBasicInfo[];
  attributes: ExtractedProfileValue[];
  preferences: ExtractedProfileValue[];
}

interface ProfileExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onApply: (
    selectedBasicInfo: ExtractedBasicInfo[],
    selectedAttributes: ExtractedProfileValue[],
    selectedPreferences: ExtractedProfileValue[],
    inputText: string
  ) => Promise<void>;
}

export function ProfileExtractorModal({
  isOpen,
  onClose,
  userId,
  onApply,
}: ProfileExtractorModalProps) {
  const [text, setText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedBasicInfo, setSelectedBasicInfo] = useState<Set<string>>(new Set());
  const [selectedAttributes, setSelectedAttributes] = useState<Set<string>>(new Set());
  const [selectedPreferences, setSelectedPreferences] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleExtract = async () => {
    if (!text.trim()) {
      setError('テキストを入力してください');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.extractProfile(userId, text);
      setResult(response);
      // デフォルトで全てを選択状態にする
      setSelectedBasicInfo(new Set(response.basicInfo.map((b) => b.field)));
      setSelectedAttributes(new Set(response.attributes.map((a) => a.code)));
      setSelectedPreferences(new Set(response.preferences.map((p) => p.code)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '抽出に失敗しました');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApply = async () => {
    if (!result) return;

    setIsApplying(true);
    setError(null);

    try {
      const basicInfoItems = result.basicInfo.filter((b) => selectedBasicInfo.has(b.field));
      const attrs = result.attributes.filter((a) => selectedAttributes.has(a.code));
      const prefs = result.preferences.filter((p) => selectedPreferences.has(p.code));
      await onApply(basicInfoItems, attrs, prefs, text);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '反映に失敗しました');
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    setText('');
    setResult(null);
    setError(null);
    setSelectedBasicInfo(new Set());
    setSelectedAttributes(new Set());
    setSelectedPreferences(new Set());
    onClose();
  };

  const toggleBasicInfo = (field: string) => {
    setSelectedBasicInfo((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  const toggleAttribute = (code: string) => {
    setSelectedAttributes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const togglePreference = (code: string) => {
    setSelectedPreferences((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '（未設定）';
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      // range type
      const range = value as { min?: number | null; max?: number | null };
      if (range.min !== undefined || range.max !== undefined) {
        const minStr = range.min !== null && range.min !== undefined ? String(range.min) : '?';
        const maxStr = range.max !== null && range.max !== undefined ? String(range.max) : '?';
        return `${minStr} 〜 ${maxStr}`;
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    const colors = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-red-100 text-red-800',
    };
    const labels = {
      high: '高',
      medium: '中',
      low: '低',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[confidence]}`}>
        {labels[confidence]}
      </span>
    );
  };

  const totalSelections =
    selectedBasicInfo.size + selectedAttributes.size + selectedPreferences.size;
  const hasSelections = totalSelections > 0;
  const hasResults =
    result &&
    (result.basicInfo.length > 0 || result.attributes.length > 0 || result.preferences.length > 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4 pt-12">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">AIでプロフィール入力補助</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Input Section */}
            {!result && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    面談メモ・ヒアリング内容
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`面談やヒアリングで得た情報をここに貼り付けてください...

例：
本人について
・32歳、IT企業でマネージャーをしている
・年収は900万円くらい
・身長は175cm
・趣味はゴルフと料理

お相手への希望
・年齢は25〜30歳くらいがいい
・できれば都内在住の方
・家庭的な雰囲気の方が好み`}
                    className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 resize-none"
                    disabled={isExtracting}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  AIがテキストから基本情報・属性・希望条件を抽出します。提案内容を確認してから反映できます。
                </p>
              </div>
            )}

            {/* Result Section */}
            {result && (
              <div className="space-y-6">
                {/* Basic Info */}
                {result.basicInfo.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span>基本情報</span>
                      <span className="text-gray-400 font-normal">
                        ({selectedBasicInfo.size}/{result.basicInfo.length}件選択中)
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {result.basicInfo.map((info) => (
                        <label
                          key={info.field}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedBasicInfo.has(info.field)
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedBasicInfo.has(info.field)}
                            onChange={() => toggleBasicInfo(info.field)}
                            className="mt-1 h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{info.name}</span>
                              {getConfidenceBadge(info.confidence)}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-2">
                              <span className="text-gray-400">
                                {formatValue(info.currentValue)}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="font-medium text-purple-600">
                                {formatValue(info.suggestedValue)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{info.reason}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attributes */}
                {result.attributes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span>プロフィール属性</span>
                      <span className="text-gray-400 font-normal">
                        ({selectedAttributes.size}/{result.attributes.length}件選択中)
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {result.attributes.map((attr) => (
                        <label
                          key={attr.code}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedAttributes.has(attr.code)
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedAttributes.has(attr.code)}
                            onChange={() => toggleAttribute(attr.code)}
                            className="mt-1 h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{attr.name}</span>
                              {getConfidenceBadge(attr.confidence)}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-2">
                              <span className="text-gray-400">
                                {formatValue(attr.currentValue)}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="font-medium text-purple-600">
                                {formatValue(attr.suggestedValue)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{attr.reason}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preferences */}
                {result.preferences.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span>希望条件</span>
                      <span className="text-gray-400 font-normal">
                        ({selectedPreferences.size}/{result.preferences.length}件選択中)
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {result.preferences.map((pref) => (
                        <label
                          key={pref.code}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedPreferences.has(pref.code)
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPreferences.has(pref.code)}
                            onChange={() => togglePreference(pref.code)}
                            className="mt-1 h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{pref.name}</span>
                              {getConfidenceBadge(pref.confidence)}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-2">
                              <span className="text-gray-400">
                                {formatValue(pref.currentValue)}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="font-medium text-purple-600">
                                {formatValue(pref.suggestedValue)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{pref.reason}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* No results */}
                {!hasResults && (
                  <div className="text-center py-8 text-gray-500">
                    <p>テキストから抽出できる情報が見つかりませんでした。</p>
                    <button
                      onClick={() => setResult(null)}
                      className="mt-4 text-purple-600 hover:underline"
                    >
                      テキストを編集する
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
            {result ? (
              <>
                <button
                  onClick={() => setResult(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={isApplying}
                >
                  ← テキストに戻る
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    disabled={isApplying}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={isApplying || !hasSelections}
                    className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isApplying ? '反映中...' : `選択した項目を反映 (${totalSelections}件)`}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div />
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    disabled={isExtracting}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleExtract}
                    disabled={isExtracting || !text.trim()}
                    className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isExtracting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        <span>解析中...</span>
                      </>
                    ) : (
                      <>
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
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        <span>AIで解析</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
