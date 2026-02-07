'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { PageLayout } from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import type {
  AdminUser,
  User,
  MatchingCandidate,
  Occupation,
  Prefecture,
  MatchingVenue,
  CandidateFilters,
  CreateMatchingRequest,
} from '@/types';

// 年齢計算
function calculateAge(birthday: string | null): number | null {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// 性別の表示
function getGenderLabel(gender: number): string {
  return gender === 1 ? '男性' : gender === 2 ? '女性' : '不明';
}

// 適合度スコアの色
function getMatchScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800';
  if (score >= 50) return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-800';
}

export default function CreateMatchingPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ソースユーザー（マッチング元）
  const [sourceUser, setSourceUser] = useState<User | null>(null);
  const [sourcePreferences, setSourcePreferences] = useState<
    { preferenceTypeCode: string; value: unknown }[]
  >([]);

  // 候補者
  const [candidates, setCandidates] = useState<MatchingCandidate[]>([]);
  const [candidatesTotal, setCandidatesTotal] = useState(0);
  const [selectedCandidate, setSelectedCandidate] = useState<MatchingCandidate | null>(null);

  // フィルター
  const [filters, setFilters] = useState<CandidateFilters>({});
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [prefectures, setPrefectures] = useState<Prefecture[]>([]);

  // マッチング作成フォーム
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [venues, setVenues] = useState<MatchingVenue[]>([]);
  const [formData, setFormData] = useState<Partial<CreateMatchingRequest>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // 画像ギャラリーモーダル
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);

  const openGallery = (images: string[], startIndex: number = 0) => {
    setGalleryImages(images);
    setGalleryIndex(startIndex);
    setShowGallery(true);
  };

  const closeGallery = () => {
    setShowGallery(false);
  };

  const nextImage = () => {
    setGalleryIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const prevImage = () => {
    setGalleryIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  useEffect(() => {
    const checkAuth = async () => {
      if (api.getAccessToken()) {
        setIsAuthenticated(true);
        setCurrentUser(api.getCurrentUser());
        await Promise.all([loadSourceUser(), loadCandidates(), loadMasterData()]);
        setIsLoading(false);
        return;
      }

      try {
        await api.refresh();
        setIsAuthenticated(true);
        const adminUser = await api.getMe();
        setCurrentUser(adminUser);
        await Promise.all([loadSourceUser(), loadCandidates(), loadMasterData()]);
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, userId]);

  const loadSourceUser = async () => {
    try {
      const user = await api.getUser(userId);
      setSourceUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザーの読み込みに失敗しました');
    }
  };

  const loadCandidates = useCallback(
    async (newFilters?: CandidateFilters) => {
      try {
        const data = await api.getMatchingCandidates(userId, newFilters || filters);
        setCandidates(data.candidates);
        setCandidatesTotal(data.total);
        setSourcePreferences(data.sourceUser.preferences);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '候補者の読み込みに失敗しました');
      }
    },
    [userId, filters]
  );

  const loadMasterData = async () => {
    try {
      const [occData, prefData, venueData] = await Promise.all([
        api.getOccupations(),
        api.getPrefectures(),
        api.getVenues('', true),
      ]);
      setOccupations(occData.occupations);
      setPrefectures(prefData);
      setVenues(venueData.venues);
    } catch (err) {
      console.error('Failed to load master data:', err);
    }
  };

  const handleFilterChange = (newFilters: CandidateFilters) => {
    setFilters(newFilters);
    loadCandidates(newFilters);
  };

  const handleSelectCandidate = (candidate: MatchingCandidate) => {
    setSelectedCandidate(candidate);
    setShowCreateForm(false);
    setCreateError(null);
  };

  const handleStartCreateMatching = () => {
    if (!selectedCandidate || !sourceUser) return;

    // デフォルト日時（明日の18:00-20:00）
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    const startAt = tomorrow.toISOString().slice(0, 16);
    tomorrow.setHours(20, 0, 0, 0);
    const endAt = tomorrow.toISOString().slice(0, 16);

    // 男女を判定
    const maleUserId = sourceUser.gender === 1 ? sourceUser.id : selectedCandidate.id;
    const femaleUserId = sourceUser.gender === 2 ? sourceUser.id : selectedCandidate.id;

    setFormData({
      maleUserId,
      femaleUserId,
      startAt,
      endAt,
      venueId: '',
      notes: '',
    });
    setShowCreateForm(true);
    setCreateError(null);
  };

  const handleCreateMatching = async () => {
    if (!formData.maleUserId || !formData.femaleUserId || !formData.startAt || !formData.endAt) {
      setCreateError('必須項目を入力してください');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      await api.createMatching({
        maleUserId: formData.maleUserId,
        femaleUserId: formData.femaleUserId,
        startAt: formData.startAt,
        endAt: formData.endAt,
        venueId: formData.venueId || undefined,
        notes: formData.notes || undefined,
      });
      // 成功したらマッチング一覧へ
      router.push('/admin/black/matchings');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'マッチングの作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    router.push('/admin/login');
  };

  // 希望条件のラベル
  const preferenceLabels: Record<string, string> = {
    desired_age: '年齢',
    desired_income: '年収',
    desired_occupation: '職業',
    desired_location: '居住地',
    desired_height: '身長',
    desired_smoking: '喫煙',
    desired_drinking: '飲酒',
    desired_marriage_history: '婚姻歴',
    desired_education: '学歴',
    desired_other: 'その他',
  };

  // 希望条件の表示用テキスト生成
  const formatPreferenceValue = (code: string, value: unknown): string | null => {
    if (!value) return null;
    if (typeof value === 'string' && value === '指定なし') return null;

    if (code === 'desired_age' || code === 'desired_income' || code === 'desired_height') {
      const rv = value as { min?: number | null; max?: number | null };
      const unit = code === 'desired_age' ? '歳' : code === 'desired_income' ? '万円' : 'cm';
      if (rv.min && rv.max) return `${rv.min}〜${rv.max}${unit}`;
      if (rv.min) return `${rv.min}${unit}以上`;
      if (rv.max) return `${rv.max}${unit}以下`;
      return null;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      // 長い場合は省略
      if (value.length > 3) {
        return `${value.slice(0, 3).join('、')} 他${value.length - 3}件`;
      }
      return value.join('、');
    }

    const strValue = String(value);
    if (strValue === '指定なし' || strValue === '') return null;
    return strValue;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !sourceUser) {
    return null;
  }

  const sourceAge = calculateAge(sourceUser.birthday);

  return (
    <PageLayout
      currentPage="black-users"
      title="マッチング作成"
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      <div className="space-y-4">
        {/* パンくずリスト */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin/black/users" className="hover:text-blue-600">
            ユーザー管理
          </Link>
          <span>/</span>
          <Link href={`/admin/black/users/${userId}`} className="hover:text-blue-600">
            {sourceUser.lastName} {sourceUser.firstName}
          </Link>
          <span>/</span>
          <span className="text-gray-900">マッチング作成</span>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* ソースユーザー情報 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            {/* プロフィール画像 */}
            <div className="flex-shrink-0">
              {sourceUser.profileImageUrl ? (
                <button
                  onClick={() =>
                    openGallery(
                      (sourceUser.profileImages || [sourceUser.profileImageUrl]).filter(
                        (url): url is string => !!url
                      ),
                      0
                    )
                  }
                  className="block relative group"
                >
                  <img
                    src={sourceUser.profileImageUrl}
                    alt={`${sourceUser.lastName} ${sourceUser.firstName}`}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                      />
                    </svg>
                  </div>
                  {(sourceUser.profileImages?.length || 0) > 1 && (
                    <span className="absolute -bottom-1 -right-1 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded-full">
                      +{(sourceUser.profileImages?.length || 1) - 1}
                    </span>
                  )}
                </button>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}
              {/* サムネイル一覧 */}
              {(sourceUser.profileImages?.length || 0) > 1 && (
                <div className="flex gap-1 mt-2">
                  {sourceUser.profileImages?.slice(0, 4).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => openGallery(sourceUser.profileImages || [], idx)}
                      className="w-6 h-6 rounded overflow-hidden hover:ring-2 hover:ring-blue-400 transition-all"
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {(sourceUser.profileImages?.length || 0) > 4 && (
                    <button
                      onClick={() => openGallery(sourceUser.profileImages || [], 4)}
                      className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-600 hover:bg-gray-300 transition-colors"
                    >
                      +{(sourceUser.profileImages?.length || 0) - 4}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  {sourceUser.lastName} {sourceUser.firstName}
                </h2>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded ${
                    sourceUser.gender === 1
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-pink-100 text-pink-700'
                  }`}
                >
                  {getGenderLabel(sourceUser.gender)}
                </span>
                {sourceAge && <span className="text-sm text-gray-500">{sourceAge}歳</span>}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {sourceUser.prefecture?.name || '-'} / {sourceUser.occupation?.name || '-'}
              </p>
            </div>
          </div>

          {/* 希望条件サマリ */}
          {sourcePreferences.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-4">希望条件</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sourcePreferences.map((pref, idx) => {
                  const label =
                    preferenceLabels[pref.preferenceTypeCode] || pref.preferenceTypeCode;
                  const text = formatPreferenceValue(pref.preferenceTypeCode, pref.value);
                  if (!text) return null;
                  return (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">{label}</p>
                      <p className="text-sm text-gray-900 font-medium">{text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* メインコンテンツ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 左: 候補者一覧 */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">
                候補者一覧
                <span className="ml-2 text-gray-500 font-normal">({candidatesTotal}件)</span>
              </h3>
            </div>

            {/* フィルター */}
            <div className="p-4 border-b border-gray-100 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="名前・IDで検索..."
                  value={filters.q || ''}
                  onChange={(e) => handleFilterChange({ ...filters, q: e.target.value })}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={filters.prefectureId || ''}
                  onChange={(e) => handleFilterChange({ ...filters, prefectureId: e.target.value })}
                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="">都道府県</option>
                  {prefectures.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.occupationId || ''}
                  onChange={(e) => handleFilterChange({ ...filters, occupationId: e.target.value })}
                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="">職業</option>
                  {occupations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.ageMin || ''}
                  onChange={(e) => handleFilterChange({ ...filters, ageMin: e.target.value })}
                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="">年齢下限</option>
                  {Array.from({ length: 41 }, (_, i) => 20 + i).map((age) => (
                    <option key={age} value={age}>
                      {age}歳以上
                    </option>
                  ))}
                </select>
                <select
                  value={filters.ageMax || ''}
                  onChange={(e) => handleFilterChange({ ...filters, ageMax: e.target.value })}
                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="">年齢上限</option>
                  {Array.from({ length: 41 }, (_, i) => 20 + i).map((age) => (
                    <option key={age} value={age}>
                      {age}歳以下
                    </option>
                  ))}
                </select>
                {(filters.q ||
                  filters.prefectureId ||
                  filters.occupationId ||
                  filters.ageMin ||
                  filters.ageMax) && (
                  <button
                    onClick={() => handleFilterChange({})}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    クリア
                  </button>
                )}
              </div>
            </div>

            {/* 候補者リスト */}
            <div className="max-h-[500px] overflow-y-auto">
              {candidates.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-500">候補者が見つかりません</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {candidates.map((candidate) => {
                    const age = calculateAge(candidate.birthday);
                    const isSelected = selectedCandidate?.id === candidate.id;
                    return (
                      <li key={candidate.id}>
                        <button
                          onClick={() => handleSelectCandidate(candidate)}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                            isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* プロフィール画像 */}
                            <div className="flex-shrink-0">
                              {candidate.profileImageUrl ? (
                                <img
                                  src={candidate.profileImageUrl}
                                  alt={`${candidate.lastName} ${candidate.firstName}`}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  <svg
                                    className="w-5 h-5 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {candidate.lastName} {candidate.firstName}
                                </span>
                                {age && <span className="text-sm text-gray-500">{age}歳</span>}
                                {candidate.pastMatchingCount > 0 && (
                                  <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700">
                                    {candidate.pastMatchingCount}回
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {candidate.prefecture?.name || '-'} /{' '}
                                {candidate.occupation?.name || '-'}
                              </p>
                            </div>
                            {candidate.matchScore > 0 && (
                              <span
                                className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${getMatchScoreColor(candidate.matchScore)}`}
                              >
                                適合: {candidate.matchScore}%
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* 右: 候補者詳細 & マッチング作成 */}
          <div className="space-y-4">
            {selectedCandidate ? (
              <>
                {/* 候補者詳細 */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">候補者詳細</h3>
                    <Link
                      href={`/admin/black/users/${selectedCandidate.id}`}
                      target="_blank"
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      詳細ページを開く →
                    </Link>
                  </div>
                  <div className="p-4">
                    <div className="flex gap-4 mb-4">
                      {/* プロフィール画像 */}
                      <div className="flex-shrink-0">
                        {selectedCandidate.profileImageUrl ? (
                          <button
                            onClick={() =>
                              openGallery(
                                (
                                  selectedCandidate.profileImages || [
                                    selectedCandidate.profileImageUrl,
                                  ]
                                ).filter((url): url is string => !!url),
                                0
                              )
                            }
                            className="block relative group"
                          >
                            <img
                              src={selectedCandidate.profileImageUrl}
                              alt={`${selectedCandidate.lastName} ${selectedCandidate.firstName}`}
                              className="w-20 h-20 rounded-lg object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                              <svg
                                className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                                />
                              </svg>
                            </div>
                            {(selectedCandidate.profileImages?.length || 0) > 1 && (
                              <span className="absolute -bottom-1 -right-1 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded-full">
                                +{(selectedCandidate.profileImages?.length || 1) - 1}
                              </span>
                            )}
                          </button>
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center">
                            <svg
                              className="w-10 h-10 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </div>
                        )}
                        {/* サムネイル一覧 */}
                        {(selectedCandidate.profileImages?.length || 0) > 1 && (
                          <div className="flex gap-1 mt-2">
                            {selectedCandidate.profileImages?.slice(0, 4).map((img, idx) => (
                              <button
                                key={idx}
                                onClick={() =>
                                  openGallery(selectedCandidate.profileImages || [], idx)
                                }
                                className="w-8 h-8 rounded overflow-hidden hover:ring-2 hover:ring-blue-400 transition-all"
                              >
                                <img src={img} alt="" className="w-full h-full object-cover" />
                              </button>
                            ))}
                            {(selectedCandidate.profileImages?.length || 0) > 4 && (
                              <button
                                onClick={() =>
                                  openGallery(selectedCandidate.profileImages || [], 4)
                                }
                                className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-600 hover:bg-gray-300 transition-colors"
                              >
                                +{(selectedCandidate.profileImages?.length || 0) - 4}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {selectedCandidate.lastName} {selectedCandidate.firstName}
                          </h4>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${
                              selectedCandidate.gender === 1
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-pink-100 text-pink-700'
                            }`}
                          >
                            {getGenderLabel(selectedCandidate.gender)}
                          </span>
                        </div>
                        {selectedCandidate.matchScore > 0 && (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getMatchScoreColor(selectedCandidate.matchScore)}`}
                          >
                            適合: {selectedCandidate.matchScore}%
                          </span>
                        )}
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-gray-500">年齢</dt>
                        <dd className="text-gray-900">
                          {calculateAge(selectedCandidate.birthday) || '-'}歳
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">居住地</dt>
                        <dd className="text-gray-900">
                          {selectedCandidate.prefecture?.name || '-'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">職業</dt>
                        <dd className="text-gray-900">
                          {selectedCandidate.occupation?.name || '-'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">プラン</dt>
                        <dd className="text-gray-900">{selectedCandidate.plan?.name || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">スコア</dt>
                        <dd className="text-gray-900">{selectedCandidate.score}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">ID</dt>
                        <dd className="text-gray-900">#{selectedCandidate.id}</dd>
                      </div>
                    </dl>

                    {/* 過去のマッチング履歴 */}
                    {selectedCandidate.pastMatchingCount > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          過去のマッチング ({selectedCandidate.pastMatchingCount}回)
                        </p>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {selectedCandidate.pastMatchings.map((pm) => {
                            const statusLabel =
                              {
                                pending: '調整中',
                                confirmed: '確定',
                                completed: '完了',
                                cancelled: 'キャンセル',
                              }[pm.currentStatus] || pm.currentStatus;
                            const statusColor =
                              {
                                pending: 'text-yellow-600',
                                confirmed: 'text-green-600',
                                completed: 'text-blue-600',
                                cancelled: 'text-gray-500',
                              }[pm.currentStatus] || 'text-gray-600';
                            return (
                              <div
                                key={pm.id}
                                className="flex items-center justify-between text-xs bg-gray-50 rounded p-2"
                              >
                                <div>
                                  <span className="text-gray-700">
                                    {new Date(pm.startAt).toLocaleDateString('ja-JP')}
                                  </span>
                                  {pm.venue && (
                                    <span className="text-gray-500 ml-2">{pm.venue.name}</span>
                                  )}
                                </div>
                                <span className={`font-medium ${statusColor}`}>{statusLabel}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={handleStartCreateMatching}
                        className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        この方とマッチングを作成
                      </button>
                    </div>
                  </div>
                </div>

                {/* マッチング作成フォーム */}
                {showCreateForm && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                      <h3 className="text-sm font-semibold text-gray-900">マッチング詳細</h3>
                    </div>
                    <div className="p-4 space-y-4">
                      {createError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                          {createError}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            開始日時 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="datetime-local"
                            value={formData.startAt || ''}
                            onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            終了日時 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="datetime-local"
                            value={formData.endAt || ''}
                            onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          待合せ場所
                        </label>
                        <select
                          value={formData.venueId || ''}
                          onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">未設定</option>
                          {venues.map((venue) => (
                            <option key={venue.id} value={venue.id}>
                              {venue.name} {venue.genre ? `(${venue.genre})` : ''}{' '}
                              {venue.city ? `- ${venue.city}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
                        <textarea
                          value={formData.notes || ''}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          rows={3}
                          placeholder="特記事項など"
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowCreateForm(false)}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={handleCreateMatching}
                          disabled={isCreating}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {isCreating ? '作成中...' : 'マッチングを作成'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-sm">左の一覧から候補者を選択してください</p>
              </div>
            )}
          </div>
        </div>

        {/* 戻るリンク */}
        <div className="pt-4">
          <Link
            href={`/admin/black/users/${userId}`}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            ユーザー詳細に戻る
          </Link>
        </div>
      </div>

      {/* 画像ギャラリーモーダル */}
      {showGallery && galleryImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
          onClick={closeGallery}
        >
          {/* 閉じるボタン */}
          <button
            onClick={closeGallery}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* 前へボタン */}
          {galleryImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-4 text-white hover:text-gray-300 transition-colors p-2"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* メイン画像 */}
          <div className="max-w-4xl max-h-[80vh] mx-16" onClick={(e) => e.stopPropagation()}>
            <img
              src={galleryImages[galleryIndex]}
              alt={`画像 ${galleryIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>

          {/* 次へボタン */}
          {galleryImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-4 text-white hover:text-gray-300 transition-colors p-2"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {/* ページインジケーター */}
          {galleryImages.length > 1 && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
              <span className="text-white text-sm">
                {galleryIndex + 1} / {galleryImages.length}
              </span>
              <div className="flex gap-2">
                {galleryImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setGalleryIndex(idx);
                    }}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === galleryIndex ? 'bg-white' : 'bg-gray-500 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}
