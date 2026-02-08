'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type {
  UserPreferenceType,
  UserPreference,
  RangeValue,
  RangeOptions,
  SelectOptions,
  TextOptions,
  SaveUserPreferenceRequest,
} from '@/types';

interface UserPreferencesEditorProps {
  userId: string;
  userGender: number; // 1=男性, 2=女性
}

export function UserPreferencesEditor({ userId, userGender }: UserPreferencesEditorProps) {
  const [preferenceTypes, setPreferenceTypes] = useState<UserPreferenceType[]>([]);
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 編集中のデータ
  const [editedValues, setEditedValues] = useState<Record<string, RangeValue | string | string[]>>(
    {}
  );
  const [hasChanges, setHasChanges] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [typesData, prefsData] = await Promise.all([
        api.getPreferenceTypes(userGender),
        api.getUserPreferences(userId),
      ]);
      setPreferenceTypes(typesData.preferenceTypes);
      setPreferences(prefsData.preferences);

      // 既存のデータを編集用ステートにセット
      const initial: Record<string, RangeValue | string | string[]> = {};
      prefsData.preferences.forEach((p) => {
        initial[p.preferenceTypeId] = p.value;
      });
      setEditedValues(initial);
      setHasChanges(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [userId, userGender]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleValueChange = (typeId: string, value: RangeValue | string | string[]) => {
    setEditedValues((prev) => ({
      ...prev,
      [typeId]: value,
    }));
    setHasChanges(true);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const prefsToSave: SaveUserPreferenceRequest[] = [];
      Object.entries(editedValues).forEach(([typeId, value]) => {
        // 空値はスキップ
        if (value === undefined || value === null) return;
        if (typeof value === 'string' && !value.trim()) return;
        if (Array.isArray(value) && value.length === 0) return;
        if (typeof value === 'object' && !Array.isArray(value)) {
          const rv = value as RangeValue;
          if (rv.min === null && rv.max === null) return;
        }

        prefsToSave.push({
          preferenceTypeId: typeId,
          value,
        });
      });

      const result = await api.saveUserPreferences(userId, { preferences: prefsToSave });
      setPreferences(result.preferences);
      setHasChanges(false);
      setSuccessMessage('保存しました');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // range型のセレクトボックス用オプションを生成
  const generateRangeOptions = (opts: RangeOptions | undefined) => {
    if (!opts) return [];
    const { min = 0, max = 100, step = 1 } = opts;
    const options: number[] = [];
    for (let i = min; i <= max; i += step) {
      options.push(i);
    }
    return options;
  };

  const renderField = (type: UserPreferenceType) => {
    const currentValue = editedValues[type.id];

    switch (type.fieldType) {
      case 'range': {
        const opts = type.options as RangeOptions;
        const rangeValue = (currentValue as RangeValue) || { min: null, max: null };
        const rangeOptions = generateRangeOptions(opts);
        const unit = opts?.unit || '';

        // 下限選択肢: 上限が設定されていれば、それ以下のみ表示
        const minOptions =
          rangeValue.max !== null ? rangeOptions.filter((v) => v <= rangeValue.max!) : rangeOptions;

        // 上限選択肢: 下限が設定されていれば、それ以上のみ表示
        const maxOptions =
          rangeValue.min !== null ? rangeOptions.filter((v) => v >= rangeValue.min!) : rangeOptions;

        return (
          <div className="flex items-center gap-2">
            <select
              value={rangeValue.min ?? ''}
              onChange={(e) =>
                handleValueChange(type.id, {
                  ...rangeValue,
                  min: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              className="w-32 px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="">指定なし</option>
              {minOptions.map((val) => (
                <option key={val} value={val}>
                  {val}
                  {unit}
                </option>
              ))}
            </select>
            <span className="text-gray-500">〜</span>
            <select
              value={rangeValue.max ?? ''}
              onChange={(e) =>
                handleValueChange(type.id, {
                  ...rangeValue,
                  max: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              className="w-32 px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="">指定なし</option>
              {maxOptions.map((val) => (
                <option key={val} value={val}>
                  {val}
                  {unit}
                </option>
              ))}
            </select>
          </div>
        );
      }

      case 'select': {
        const opts = type.options as SelectOptions;
        const selectValue = (currentValue as string) || '';
        return (
          <select
            value={selectValue}
            onChange={(e) => handleValueChange(type.id, e.target.value)}
            className="w-full max-w-xs px-3 py-1.5 border border-gray-300 rounded text-sm"
          >
            <option value="">選択してください</option>
            {opts?.choices?.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        );
      }

      case 'multiSelect': {
        const opts = type.options as SelectOptions;
        const multiValue = (currentValue as string[]) || [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {opts?.choices?.map((choice) => {
                const isSelected = multiValue.includes(choice);
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        handleValueChange(
                          type.id,
                          multiValue.filter((v) => v !== choice)
                        );
                      } else {
                        handleValueChange(type.id, [...multiValue, choice]);
                      }
                    }}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      isSelected
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
            {multiValue.length > 0 && (
              <p className="text-xs text-gray-500">{multiValue.length}件選択中</p>
            )}
          </div>
        );
      }

      case 'text': {
        const opts = type.options as TextOptions;
        const textValue = (currentValue as string) || '';
        return (
          <textarea
            value={textValue}
            onChange={(e) => handleValueChange(type.id, e.target.value)}
            placeholder={opts?.placeholder}
            maxLength={opts?.maxLength}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
        );
      }

      default:
        return <p className="text-sm text-gray-500">未対応のフィールドタイプです</p>;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-base font-semibold text-gray-900">希望条件</h3>
        </div>
        <div className="p-6 text-center text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">希望条件</h3>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            !hasChanges || isSaving
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary-dark'
          }`}
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            {successMessage}
          </div>
        )}

        {preferenceTypes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">設定可能な希望条件がありません</p>
        ) : (
          <div className="space-y-6">
            {preferenceTypes.map((type) => (
              <div key={type.id} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {type.name}
                  {type.targetGender && (
                    <span className="ml-2 text-xs text-gray-400">
                      ({type.targetGender === 1 ? '男性向け' : '女性向け'})
                    </span>
                  )}
                </label>
                {renderField(type)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
