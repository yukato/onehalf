'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { MatchingExtractionResult, User, MatchingVenue } from '@/types';

interface MatchingExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: {
    maleUserId: string;
    femaleUserId: string;
    startAt: string;
    endAt: string;
    venueId?: string;
    notes?: string;
  }) => Promise<void>;
}

export function MatchingExtractorModal({ isOpen, onClose, onApply }: MatchingExtractorModalProps) {
  const [text, setText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState<MatchingExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // フォームの状態
  const [selectedMale, setSelectedMale] = useState<User | null>(null);
  const [selectedFemale, setSelectedFemale] = useState<User | null>(null);
  const [maleSearch, setMaleSearch] = useState('');
  const [femaleSearch, setFemaleSearch] = useState('');
  const [maleUsers, setMaleUsers] = useState<User[]>([]);
  const [femaleUsers, setFemaleUsers] = useState<User[]>([]);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [venues, setVenues] = useState<MatchingVenue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadVenues();
    }
  }, [isOpen]);

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
      const response = await api.extractMatching(text);
      setResult(response);

      // 抽出結果をフォームに反映
      if (response.maleUser.suggestedId) {
        const user = await api.getUser(response.maleUser.suggestedId);
        setSelectedMale(user);
      } else if (response.maleUser.searchQuery) {
        setMaleSearch(response.maleUser.searchQuery);
        searchMaleUsers(response.maleUser.searchQuery);
      }

      if (response.femaleUser.suggestedId) {
        const user = await api.getUser(response.femaleUser.suggestedId);
        setSelectedFemale(user);
      } else if (response.femaleUser.searchQuery) {
        setFemaleSearch(response.femaleUser.searchQuery);
        searchFemaleUsers(response.femaleUser.searchQuery);
      }

      if (response.dateTime.suggestedStartAt) {
        setStartAt(response.dateTime.suggestedStartAt);
      }
      if (response.dateTime.suggestedEndAt) {
        setEndAt(response.dateTime.suggestedEndAt);
      }

      if (response.notes.suggestedValue) {
        setNotes(response.notes.suggestedValue);
      }

      // 会場名からマッチングを試みる
      if (response.venue.suggestedName) {
        const matchingVenue = venues.find(
          (v) =>
            v.name.includes(response.venue.suggestedName!) ||
            response.venue.suggestedName!.includes(v.name)
        );
        if (matchingVenue) {
          setSelectedVenueId(matchingVenue.id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '抽出に失敗しました');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApply = async () => {
    if (!selectedMale || !selectedFemale || !startAt || !endAt) {
      setError('必須項目を入力してください');
      return;
    }

    setIsApplying(true);
    setError(null);

    try {
      await onApply({
        maleUserId: selectedMale.id,
        femaleUserId: selectedFemale.id,
        startAt,
        endAt,
        venueId: selectedVenueId || undefined,
        notes: notes || undefined,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました');
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    setText('');
    setResult(null);
    setError(null);
    setSelectedMale(null);
    setSelectedFemale(null);
    setMaleSearch('');
    setFemaleSearch('');
    setMaleUsers([]);
    setFemaleUsers([]);
    setStartAt('');
    setEndAt('');
    setSelectedVenueId('');
    setNotes('');
    onClose();
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

  const canApply = selectedMale && selectedFemale && startAt && endAt;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4 pt-12">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">AIでマッチング作成</h2>
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
                    チーム内でのやり取り・面談メモ
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`チーム内でのやり取りや面談メモをここに貼り付けてください...

例：
山田さん（男性）と鈴木さん（女性）の顔合わせの件です。
2/15(土) 18:00〜 恵比寿のビストロで調整できました。
お二人とも確定で大丈夫です。
服装はスマートカジュアルでお願いしています。`}
                    className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 resize-none"
                    disabled={isExtracting}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  AIがテキストからマッチング情報を抽出します。抽出後、確認・修正してから作成できます。
                </p>
              </div>
            )}

            {/* Result Section */}
            {result && (
              <div className="space-y-6">
                {/* 抽出結果サマリー */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3">抽出結果</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 w-20">男性会員:</span>
                      <span className="font-medium">
                        {result.maleUser.searchQuery || '（検出なし）'}
                      </span>
                      {getConfidenceBadge(result.maleUser.confidence)}
                      {result.maleUser.reason && (
                        <span className="text-gray-500 text-xs">- {result.maleUser.reason}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 w-20">女性会員:</span>
                      <span className="font-medium">
                        {result.femaleUser.searchQuery || '（検出なし）'}
                      </span>
                      {getConfidenceBadge(result.femaleUser.confidence)}
                      {result.femaleUser.reason && (
                        <span className="text-gray-500 text-xs">- {result.femaleUser.reason}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 w-20">日時:</span>
                      <span className="font-medium">
                        {result.dateTime.suggestedStartAt
                          ? `${result.dateTime.suggestedStartAt} 〜 ${result.dateTime.suggestedEndAt || ''}`
                          : '（検出なし）'}
                      </span>
                      {getConfidenceBadge(result.dateTime.confidence)}
                    </div>
                    {result.venue.suggestedName && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 w-20">場所:</span>
                        <span className="font-medium">{result.venue.suggestedName}</span>
                        {getConfidenceBadge(result.venue.confidence)}
                      </div>
                    )}
                  </div>
                </div>

                {/* フォーム */}
                <div className="space-y-4">
                  {/* 男性会員 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      男性会員 <span className="text-red-500">*</span>
                    </label>
                    {selectedMale ? (
                      <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div>
                          <span className="font-medium">
                            {selectedMale.lastName} {selectedMale.firstName}
                          </span>
                          <span className="text-sm text-gray-500 ml-2">#{selectedMale.id}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                          placeholder="名前またはIDで検索..."
                        />
                        {maleUsers.length > 0 && (
                          <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {maleUsers.map((user) => (
                              <li key={user.id}>
                                <button
                                  type="button"
                                  onClick={() => {
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                          placeholder="名前またはIDで検索..."
                        />
                        {femaleUsers.length > 0 && (
                          <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {femaleUsers.map((user) => (
                              <li key={user.id}>
                                <button
                                  type="button"
                                  onClick={() => {
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
                        value={startAt}
                        onChange={(e) => setStartAt(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        終了日時 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={endAt}
                        onChange={(e) => setEndAt(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* 待合せ場所 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      待合せ場所
                    </label>
                    <select
                      value={selectedVenueId}
                      onChange={(e) => setSelectedVenueId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    >
                      <option value="">未設定</option>
                      {venues.map((venue) => (
                        <option key={venue.id} value={venue.id}>
                          {venue.name} {venue.genre ? `(${venue.genre})` : ''}{' '}
                          {venue.city ? `- ${venue.city}` : ''}
                        </option>
                      ))}
                    </select>
                    {result.venue.suggestedName && !selectedVenueId && (
                      <p className="mt-1 text-xs text-amber-600">
                        ヒント: 「{result.venue.suggestedName}
                        」が検出されましたが、登録済みの会場と一致しませんでした
                      </p>
                    )}
                  </div>

                  {/* メモ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      rows={3}
                      placeholder="特記事項など"
                    />
                  </div>
                </div>
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
                    disabled={isApplying || !canApply}
                    className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isApplying ? '作成中...' : 'マッチングを作成'}
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
