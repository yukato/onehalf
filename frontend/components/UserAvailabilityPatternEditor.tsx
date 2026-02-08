'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { UserAvailabilityPattern, DayType } from '@/types';

interface UserAvailabilityPatternEditorProps {
  userId: string;
}

const DAY_TYPE_OPTIONS: { value: DayType; label: string }[] = [
  { value: 'weekday', label: '平日' },
  { value: 'monday', label: '月曜日' },
  { value: 'tuesday', label: '火曜日' },
  { value: 'wednesday', label: '水曜日' },
  { value: 'thursday', label: '木曜日' },
  { value: 'friday', label: '金曜日' },
  { value: 'saturday', label: '土曜日' },
  { value: 'sunday', label: '日曜日' },
  { value: 'holiday', label: '祝日' },
];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:00`);
  TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:30`);
}

interface EditFormData {
  dayType: DayType;
  startTime: string;
  endTime: string;
  notes: string;
  isActive: boolean;
}

export function UserAvailabilityPatternEditor({ userId }: UserAvailabilityPatternEditorProps) {
  const [patterns, setPatterns] = useState<UserAvailabilityPattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 新規追加
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPattern, setNewPattern] = useState<EditFormData>({
    dayType: 'weekday',
    startTime: '19:00',
    endTime: '21:00',
    notes: '',
    isActive: true,
  });

  // 編集モード
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormData | null>(null);

  // 削除
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPatterns = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getUserAvailabilityPatterns(userId);
      setPatterns(data.patterns);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPatterns();
  }, [loadPatterns]);

  const handleAdd = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await api.createAvailabilityPattern(userId, {
        dayType: newPattern.dayType,
        startTime: newPattern.startTime,
        endTime: newPattern.endTime,
        notes: newPattern.notes || undefined,
        isActive: newPattern.isActive,
      });
      setPatterns([...patterns, created]);
      setIsAdding(false);
      setNewPattern({
        dayType: 'weekday',
        startTime: '19:00',
        endTime: '21:00',
        notes: '',
        isActive: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '追加に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (pattern: UserAvailabilityPattern) => {
    setEditingId(pattern.id);
    setEditForm({
      dayType: pattern.dayType,
      startTime: pattern.startTime,
      endTime: pattern.endTime,
      notes: pattern.notes || '',
      isActive: pattern.isActive,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await api.updateAvailabilityPattern(userId, editingId, {
        dayType: editForm.dayType,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        notes: editForm.notes || undefined,
        isActive: editForm.isActive,
      });
      setPatterns(patterns.map((p) => (p.id === editingId ? updated : p)));
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (patternId: string) => {
    setDeletingId(patternId);
    setError(null);
    try {
      await api.deleteAvailabilityPattern(userId, patternId);
      setPatterns(patterns.filter((p) => p.id !== patternId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (pattern: UserAvailabilityPattern) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await api.updateAvailabilityPattern(userId, pattern.id, {
        isActive: !pattern.isActive,
      });
      setPatterns(patterns.map((p) => (p.id === pattern.id ? updated : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPatternForm = (
    data: EditFormData,
    onChange: (data: EditFormData) => void,
    isNew: boolean
  ) => (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 曜日タイプ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">曜日</label>
          <select
            value={data.dayType}
            onChange={(e) => onChange({ ...data, dayType: e.target.value as DayType })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          >
            {DAY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 開始時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
          <select
            value={data.startTime}
            onChange={(e) => onChange({ ...data, startTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          >
            {TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        {/* 終了時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">終了時間</label>
          <select
            value={data.endTime}
            onChange={(e) => onChange({ ...data, endTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          >
            {TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 備考 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">備考（任意）</label>
        <input
          type="text"
          value={data.notes}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
          placeholder="例: 定時上がりの日のみ"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        />
      </div>

      {/* 有効/無効 */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`active-${isNew ? 'new' : editingId}`}
          checked={data.isActive}
          onChange={(e) => onChange({ ...data, isActive: e.target.checked })}
          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/50"
        />
        <label htmlFor={`active-${isNew ? 'new' : editingId}`} className="text-sm text-gray-700">
          有効
        </label>
      </div>

      {/* ボタン */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => (isNew ? setIsAdding(false) : handleCancelEdit())}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={() => (isNew ? handleAdd() : handleSaveEdit())}
          disabled={isSubmitting}
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark disabled:opacity-50"
        >
          {isSubmitting ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-base font-semibold text-gray-900">希望時間パターン</h3>
        </div>
        <div className="p-6 text-center text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">希望時間パターン</h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            追加
          </button>
        )}
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* 新規追加フォーム */}
        {isAdding && (
          <div className="mb-6">{renderPatternForm(newPattern, setNewPattern, true)}</div>
        )}

        {/* パターン一覧 */}
        {patterns.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">まだ希望時間パターンがありません</p>
        ) : (
          <div className="space-y-3">
            {patterns.map((pattern) => (
              <div
                key={pattern.id}
                className={`border rounded-lg ${
                  pattern.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                }`}
              >
                {editingId === pattern.id && editForm ? (
                  renderPatternForm(editForm, setEditForm, false)
                ) : (
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* 有効/無効トグル */}
                      <button
                        onClick={() => handleToggleActive(pattern)}
                        disabled={isSubmitting}
                        className={`w-10 h-6 rounded-full transition-colors relative ${
                          pattern.isActive ? 'bg-primary' : 'bg-gray-300'
                        }`}
                        title={pattern.isActive ? '無効にする' : '有効にする'}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            pattern.isActive ? 'left-5' : 'left-1'
                          }`}
                        />
                      </button>

                      {/* パターン情報 */}
                      <div className={pattern.isActive ? '' : 'opacity-50'}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {pattern.dayTypeLabel}
                          </span>
                          <span className="text-sm text-gray-600">
                            {pattern.startTime} 〜 {pattern.endTime}
                          </span>
                        </div>
                        {pattern.notes && (
                          <p className="text-xs text-gray-500 mt-1">{pattern.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartEdit(pattern)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                        title="編集"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(pattern.id)}
                        disabled={deletingId === pattern.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="削除"
                      >
                        <svg
                          className="w-5 h-5"
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
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 説明テキスト */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            希望時間パターンは、マッチングのデート日程調整に使用されます。
            <br />
            「平日」は月〜金曜、「祝日」は祝祭日を指します。個別の曜日を設定すると、より細かな調整が可能です。
          </p>
        </div>
      </div>
    </div>
  );
}
