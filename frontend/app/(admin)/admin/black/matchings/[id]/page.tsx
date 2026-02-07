'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { PageLayout } from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import type {
  AdminUser,
  Matching,
  MatchingStatusCode,
  MatchingVenue,
  UpdateMatchingRequest,
  MatchingActivityLog,
  MatchingFeedback,
  EvaluationCriteriaType,
  ExtractedEvaluationCriteria,
  EvaluationCriteriaInput,
  MatchingEvaluationCriteria,
} from '@/types';

// ステータスの定義
const MATCHING_STATUSES: { code: MatchingStatusCode; label: string }[] = [
  { code: 'pending', label: '調整中' },
  { code: 'confirmed', label: '確定' },
  { code: 'completed', label: '完了' },
  { code: 'cancelled', label: 'キャンセル' },
];

// ステータスコード→ラベル
function getStatusLabel(status: MatchingStatusCode): string {
  return MATCHING_STATUSES.find((s) => s.code === status)?.label || status;
}

// ステータスの色
function getStatusColor(status: MatchingStatusCode): string {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// 日時フォーマット（YYYY-MM-DD (曜) HH:mm）
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const w = weekdays[date.getDay()];
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} (${w}) ${h}:${min}`;
}

// datetime-local用フォーマット
function toDateTimeLocal(dateStr: string): string {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

// 年齢計算
function calculateAge(birthday: string | null | undefined): number | null {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function MatchingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const matchingId = params.id as string;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [matching, setMatching] = useState<Matching | null>(null);
  const [venues, setVenues] = useState<MatchingVenue[]>([]);

  // 編集モード
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<UpdateMatchingRequest>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 削除確認
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // アクティビティログ
  const [activityLogs, setActivityLogs] = useState<MatchingActivityLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  // 画像ギャラリーモーダル
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);

  // フィードバックモーダル
  const [feedbacks, setFeedbacks] = useState<MatchingFeedback[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackUserId, setFeedbackUserId] = useState<string>('');
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // 評価観点
  const [criteriaTypes, setCriteriaTypes] = useState<EvaluationCriteriaType[]>([]);
  const [feedbackCriteria, setFeedbackCriteria] = useState<Record<string, string>>({});
  const [extractedCriteria, setExtractedCriteria] = useState<ExtractedEvaluationCriteria[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [savedCriteria, setSavedCriteria] = useState<MatchingEvaluationCriteria[]>([]);
  const [hasExtractedCriteria, setHasExtractedCriteria] = useState(false);
  const [originalCriteria, setOriginalCriteria] = useState<Record<string, string>>({});
  const [originalRating, setOriginalRating] = useState<number | null>(null);

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

  const loadMatching = useCallback(async () => {
    try {
      const data = await api.getMatching(matchingId);
      setMatching(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'マッチングの読み込みに失敗しました');
    }
  }, [matchingId]);

  const loadVenues = async () => {
    try {
      const data = await api.getVenues('', true);
      setVenues(data.venues);
    } catch (err) {
      console.error('Failed to load venues:', err);
    }
  };

  const loadActivityLogs = useCallback(async () => {
    try {
      const data = await api.getMatchingActivityLogs(matchingId);
      setActivityLogs(data.logs);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    }
  }, [matchingId]);

  const loadFeedbacks = useCallback(async () => {
    try {
      const data = await api.getMatchingFeedbacks(matchingId);
      setFeedbacks(data.feedbacks);
    } catch (err) {
      console.error('Failed to load feedbacks:', err);
    }
  }, [matchingId]);

  const loadCriteriaTypes = async () => {
    try {
      const data = await api.getEvaluationCriteriaTypes();
      setCriteriaTypes(data.criteriaTypes);
    } catch (err) {
      console.error('Failed to load criteria types:', err);
    }
  };

  const loadEvaluationCriteria = useCallback(async () => {
    try {
      const data = await api.getMatchingEvaluationCriteria(matchingId);
      setSavedCriteria(data.criteria);
    } catch (err) {
      console.error('Failed to load evaluation criteria:', err);
    }
  }, [matchingId]);

  const openFeedbackModal = (userId?: string) => {
    setFeedbackUserId(userId || '');
    // 既存の評価があれば設定
    let rating: number | null = null;
    if (matching && userId === matching.maleUserId) {
      rating = matching.maleRating;
    } else if (matching && userId === matching.femaleUserId) {
      rating = matching.femaleRating;
    }
    setFeedbackRating(rating);
    setOriginalRating(rating);
    setFeedbackContent('');
    // 既存の評価観点があれば設定
    const existingCriteria: Record<string, string> = {};
    if (userId) {
      savedCriteria
        .filter((c) => c.userId === userId)
        .forEach((c) => {
          existingCriteria[c.criteriaTypeId] = c.value;
        });
    }
    setFeedbackCriteria(existingCriteria);
    setOriginalCriteria(existingCriteria);
    setExtractedCriteria([]);
    setHasExtractedCriteria(false);
    setFeedbackError(null);
    setShowFeedbackModal(true);
  };

  const handleExtractCriteria = async () => {
    if (!feedbackContent.trim()) {
      setFeedbackError('フィードバック内容を入力してからAI補完してください');
      return;
    }

    setIsExtracting(true);
    setFeedbackError(null);

    try {
      const result = await api.extractEvaluationCriteria(
        matchingId,
        feedbackContent,
        feedbackUserId || undefined
      );
      setExtractedCriteria(result.criteria);
      // 抽出結果をフォームに反映（既存値は上書きしない）
      const newCriteria: Record<string, string> = { ...feedbackCriteria };
      result.criteria.forEach((c) => {
        if (c.confidence !== 'low' && !newCriteria[c.criteriaTypeId]) {
          newCriteria[c.criteriaTypeId] = c.value;
        }
      });
      setFeedbackCriteria(newCriteria);
      setHasExtractedCriteria(true);
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'AI補完に失敗しました');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFeedbackUserChange = (userId: string) => {
    setFeedbackUserId(userId);
    // 既存の評価があれば設定
    let rating: number | null = null;
    if (matching && userId === matching.maleUserId) {
      rating = matching.maleRating;
    } else if (matching && userId === matching.femaleUserId) {
      rating = matching.femaleRating;
    }
    setFeedbackRating(rating);
    setOriginalRating(rating);
    // 既存の評価観点があれば設定
    const existingCriteria: Record<string, string> = {};
    savedCriteria
      .filter((c) => c.userId === userId)
      .forEach((c) => {
        existingCriteria[c.criteriaTypeId] = c.value;
      });
    setFeedbackCriteria(existingCriteria);
    setOriginalCriteria(existingCriteria);
    setExtractedCriteria([]);
    setHasExtractedCriteria(false);
  };

  const closeFeedbackModal = () => {
    setShowFeedbackModal(false);
    setFeedbackError(null);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackUserId) {
      setFeedbackError('ユーザーを選択してください');
      return;
    }
    if (!feedbackContent.trim()) {
      setFeedbackError('フィードバック内容を入力してください');
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackError(null);

    try {
      // 評価観点データを収集
      const criteria: EvaluationCriteriaInput[] = Object.entries(feedbackCriteria)
        .filter(([, value]) => value && value.trim())
        .map(([criteriaTypeId, value]) => ({
          criteriaTypeId,
          value: value.toString(),
        }));

      await api.createMatchingFeedback(matchingId, {
        userId: feedbackUserId,
        rating: feedbackRating,
        content: feedbackContent.trim(),
        criteria: criteria.length > 0 ? criteria : undefined,
      });
      closeFeedbackModal();
      await Promise.all([
        loadMatching(),
        loadFeedbacks(),
        loadActivityLogs(),
        loadEvaluationCriteria(),
      ]);
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'フィードバックの登録に失敗しました');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      await api.createMatchingActivityLog(matchingId, { content: newComment.trim() });
      setNewComment('');
      await loadActivityLogs();
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      if (api.getAccessToken()) {
        setIsAuthenticated(true);
        setCurrentUser(api.getCurrentUser());
        await Promise.all([
          loadMatching(),
          loadVenues(),
          loadActivityLogs(),
          loadFeedbacks(),
          loadCriteriaTypes(),
          loadEvaluationCriteria(),
        ]);
        setIsLoading(false);
        return;
      }

      try {
        await api.refresh();
        setIsAuthenticated(true);
        const user = await api.getMe();
        setCurrentUser(user);
        await Promise.all([
          loadMatching(),
          loadVenues(),
          loadActivityLogs(),
          loadFeedbacks(),
          loadCriteriaTypes(),
          loadEvaluationCriteria(),
        ]);
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, loadMatching, loadActivityLogs, loadFeedbacks, loadEvaluationCriteria]);

  const handleLogout = async () => {
    await api.logout();
    router.push('/admin/login');
  };

  const startEditing = () => {
    if (!matching) return;
    setEditData({
      startAt: toDateTimeLocal(matching.startAt),
      endAt: toDateTimeLocal(matching.endAt),
      currentStatus: matching.currentStatus,
      venueId: matching.venueId || undefined,
      maleRating: matching.maleRating,
      femaleRating: matching.femaleRating,
      notes: matching.notes || '',
    });
    setSaveError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditData({});
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!matching) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      await api.updateMatching(matching.id, editData);
      await Promise.all([loadMatching(), loadActivityLogs()]);
      setIsEditing(false);
      setEditData({});
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!matching) return;
    setIsDeleting(true);

    try {
      await api.deleteMatching(matching.id);
      router.push('/admin/black/matchings');
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !matching) {
    return null;
  }

  return (
    <PageLayout
      currentPage="black-matchings"
      title={`マッチング #${matching.id}`}
      currentUser={currentUser}
      onLogout={handleLogout}
      headerActions={
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-3 py-1.5 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors"
        >
          削除
        </button>
      }
    >
      <div className="space-y-4">
        {/* パンくずリスト */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin/black/matchings" className="hover:text-blue-600">
            マッチング
          </Link>
          <span>/</span>
          <span className="text-gray-900">#{matching.id}</span>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        )}

        {/* メインコンテンツ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 会員情報 */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">会員情報</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* 男性 */}
                <div className="p-5 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium mb-4">男性</p>
                  <div className="flex gap-4">
                    {/* プロフィール画像 */}
                    <div className="flex-shrink-0">
                      {matching.maleUser.profileImageUrl ? (
                        <button
                          onClick={() =>
                            openGallery(
                              matching.maleUser.profileImages || [
                                matching.maleUser.profileImageUrl!,
                              ],
                              0
                            )
                          }
                          className="block relative group"
                        >
                          <img
                            src={matching.maleUser.profileImageUrl}
                            alt={`${matching.maleUser.lastName} ${matching.maleUser.firstName}`}
                            className="w-20 h-20 rounded-lg object-cover"
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
                          {(matching.maleUser.profileImages?.length || 0) > 1 && (
                            <span className="absolute -bottom-1 -right-1 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded-full">
                              +{(matching.maleUser.profileImages?.length || 1) - 1}
                            </span>
                          )}
                        </button>
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-blue-100 flex items-center justify-center">
                          <svg
                            className="w-10 h-10 text-blue-300"
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
                      <Link
                        href={`/admin/black/users/${matching.maleUserId}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {matching.maleUser.lastName} {matching.maleUser.firstName}
                      </Link>
                      <p className="text-sm text-gray-500">#{matching.maleUserId}</p>

                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">年齢:</span>
                          <span className="font-medium text-gray-900">
                            {calculateAge(matching.maleUser.birthday) !== null
                              ? `${calculateAge(matching.maleUser.birthday)}歳`
                              : '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">職業:</span>
                          <span className="font-medium text-gray-900">
                            {matching.maleUser.occupation?.name || '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">居住地:</span>
                          <span className="font-medium text-gray-900">
                            {matching.maleUser.prefecture?.name || '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">プラン:</span>
                          <span className="font-medium text-gray-900">
                            {matching.maleUser.plan?.name || '-'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-blue-200">
                        <span className="text-xs text-gray-500">今回の評価: </span>
                        <span className="text-sm font-semibold text-blue-600">
                          {matching.maleRating !== null ? `${matching.maleRating}/5` : '未評価'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 女性 */}
                <div className="p-5 bg-pink-50 rounded-lg">
                  <p className="text-xs text-pink-600 font-medium mb-4">女性</p>
                  <div className="flex gap-4">
                    {/* プロフィール画像 */}
                    <div className="flex-shrink-0">
                      {matching.femaleUser.profileImageUrl ? (
                        <button
                          onClick={() =>
                            openGallery(
                              matching.femaleUser.profileImages || [
                                matching.femaleUser.profileImageUrl!,
                              ],
                              0
                            )
                          }
                          className="block relative group"
                        >
                          <img
                            src={matching.femaleUser.profileImageUrl}
                            alt={`${matching.femaleUser.lastName} ${matching.femaleUser.firstName}`}
                            className="w-20 h-20 rounded-lg object-cover"
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
                          {(matching.femaleUser.profileImages?.length || 0) > 1 && (
                            <span className="absolute -bottom-1 -right-1 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded-full">
                              +{(matching.femaleUser.profileImages?.length || 1) - 1}
                            </span>
                          )}
                        </button>
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-pink-100 flex items-center justify-center">
                          <svg
                            className="w-10 h-10 text-pink-300"
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
                      <Link
                        href={`/admin/black/users/${matching.femaleUserId}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {matching.femaleUser.lastName} {matching.femaleUser.firstName}
                      </Link>
                      <p className="text-sm text-gray-500">#{matching.femaleUserId}</p>

                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">年齢:</span>
                          <span className="font-medium text-gray-900">
                            {calculateAge(matching.femaleUser.birthday) !== null
                              ? `${calculateAge(matching.femaleUser.birthday)}歳`
                              : '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">職業:</span>
                          <span className="font-medium text-gray-900">
                            {matching.femaleUser.occupation?.name || '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">居住地:</span>
                          <span className="font-medium text-gray-900">
                            {matching.femaleUser.prefecture?.name || '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">プラン:</span>
                          <span className="font-medium text-gray-900">
                            {matching.femaleUser.plan?.name || '-'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-pink-200">
                        <span className="text-xs text-gray-500">今回の評価: </span>
                        <span className="text-sm font-semibold text-pink-600">
                          {matching.femaleRating !== null ? `${matching.femaleRating}/5` : '未評価'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* フィードバック・評価 */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">フィードバック・評価</h3>
              <button
                onClick={() => openFeedbackModal()}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                フィードバック追加
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* 男性 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-blue-600">
                      {matching.maleUser.lastName} {matching.maleUser.firstName}
                    </span>
                    <button
                      onClick={() => openFeedbackModal(matching.maleUserId)}
                      className="text-xs text-gray-400 hover:text-blue-600"
                    >
                      編集
                    </button>
                  </div>

                  {/* 評価観点 */}
                  {savedCriteria.filter((c) => c.userId === matching.maleUserId).length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                      <p className="text-xs text-gray-500 mb-2">評価観点</p>
                      <div className="flex flex-wrap gap-2">
                        {savedCriteria
                          .filter((c) => c.userId === matching.maleUserId)
                          .map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded text-xs"
                            >
                              <span className="text-gray-500">
                                {c.criteriaType?.name || '不明'}:
                              </span>
                              <span className="font-medium text-gray-700">{c.value}</span>
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* フィードバック履歴 */}
                  {feedbacks.filter((f) => f.userId === matching.maleUserId).length === 0 ? (
                    <p className="text-xs text-gray-400">フィードバックはまだありません</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500">フィードバック履歴</p>
                      {feedbacks
                        .filter((f) => f.userId === matching.maleUserId)
                        .map((fb) => (
                          <div key={fb.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-600">
                                {fb.adminUser.username}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(fb.createdAt).toLocaleString('ja-JP', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {fb.content}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* 女性 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-pink-600">
                      {matching.femaleUser.lastName} {matching.femaleUser.firstName}
                    </span>
                    <button
                      onClick={() => openFeedbackModal(matching.femaleUserId)}
                      className="text-xs text-gray-400 hover:text-pink-600"
                    >
                      編集
                    </button>
                  </div>

                  {/* 評価観点 */}
                  {savedCriteria.filter((c) => c.userId === matching.femaleUserId).length > 0 && (
                    <div className="bg-pink-50 rounded-lg p-3 mb-3">
                      <p className="text-xs text-gray-500 mb-2">評価観点</p>
                      <div className="flex flex-wrap gap-2">
                        {savedCriteria
                          .filter((c) => c.userId === matching.femaleUserId)
                          .map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded text-xs"
                            >
                              <span className="text-gray-500">
                                {c.criteriaType?.name || '不明'}:
                              </span>
                              <span className="font-medium text-gray-700">{c.value}</span>
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* フィードバック履歴 */}
                  {feedbacks.filter((f) => f.userId === matching.femaleUserId).length === 0 ? (
                    <p className="text-xs text-gray-400">フィードバックはまだありません</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500">フィードバック履歴</p>
                      {feedbacks
                        .filter((f) => f.userId === matching.femaleUserId)
                        .map((fb) => (
                          <div key={fb.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-600">
                                {fb.adminUser.username}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(fb.createdAt).toLocaleString('ja-JP', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {fb.content}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 日時・待合せ場所 */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">日時・待合せ場所</h3>
              {!isEditing && (
                <button
                  onClick={startEditing}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  編集
                </button>
              )}
            </div>
            <div className="p-6">
              {isEditing ? (
                <div className="space-y-4">
                  {saveError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {saveError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        開始日時
                      </label>
                      <input
                        type="datetime-local"
                        value={editData.startAt || ''}
                        onChange={(e) => setEditData({ ...editData, startAt: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        終了日時
                      </label>
                      <input
                        type="datetime-local"
                        value={editData.endAt || ''}
                        onChange={(e) => setEditData({ ...editData, endAt: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ステータス
                    </label>
                    <select
                      value={editData.currentStatus || ''}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          currentStatus: e.target.value as MatchingStatusCode,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {MATCHING_STATUSES.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      待合せ場所
                    </label>
                    <select
                      value={editData.venueId || ''}
                      onChange={(e) =>
                        setEditData({ ...editData, venueId: e.target.value || undefined })
                      }
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        男性評価
                      </label>
                      <select
                        value={editData.maleRating ?? ''}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            maleRating: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">未評価</option>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        女性評価
                      </label>
                      <select
                        value={editData.femaleRating ?? ''}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            femaleRating: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">未評価</option>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
                    <textarea
                      value={editData.notes || ''}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={cancelEditing}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                      disabled={isSaving}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSaving ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              ) : (
                <dl className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">開始日時</dt>
                      <dd className="text-base font-semibold text-gray-900">
                        {formatDateTime(matching.startAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">終了日時</dt>
                      <dd className="text-base font-semibold text-gray-900">
                        {formatDateTime(matching.endAt)}
                      </dd>
                    </div>
                  </div>

                  <div>
                    <dt className="text-xs text-gray-500 mb-1">待合せ場所</dt>
                    <dd>
                      {matching.venue ? (
                        <div>
                          <div className="text-base font-semibold text-gray-900">
                            {matching.venue.name}
                            {matching.venue.genre && (
                              <span className="text-sm font-normal text-gray-500 ml-2">
                                ({matching.venue.genre})
                              </span>
                            )}
                          </div>
                          {matching.venue.city && (
                            <p className="text-sm text-gray-500 mt-0.5">{matching.venue.city}</p>
                          )}
                          {matching.venue.googleMapUrl && (
                            <a
                              href={matching.venue.googleMapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-1"
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
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              Google Mapで見る
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">未設定</span>
                      )}
                    </dd>
                  </div>

                  {matching.notes && (
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">メモ</dt>
                      <dd className="text-sm text-gray-900 whitespace-pre-wrap">
                        {matching.notes}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </div>

          {/* ステータス */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">ステータス</h3>
            </div>
            <div className="p-6">
              <span
                className={`inline-block px-3 py-1.5 text-sm font-medium rounded-full ${getStatusColor(matching.currentStatus)}`}
              >
                {getStatusLabel(matching.currentStatus)}
              </span>

              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-gray-500">作成日時</dt>
                  <dd className="text-gray-900">{formatDateTime(matching.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">更新日時</dt>
                  <dd className="text-gray-900">{formatDateTime(matching.updatedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">作成者</dt>
                  <dd className="text-gray-900">{matching.arrangedByAdmin.username}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* アクティビティログ */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          log.type === 'comment'
                            ? 'bg-blue-100'
                            : log.type === 'status_change'
                              ? 'bg-green-100'
                              : log.type === 'venue_change'
                                ? 'bg-purple-100'
                                : log.type === 'date_change'
                                  ? 'bg-orange-100'
                                  : log.type === 'rating_change'
                                    ? 'bg-yellow-100'
                                    : 'bg-gray-100'
                        }`}
                      >
                        <span
                          className={`text-xs font-medium ${
                            log.type === 'comment'
                              ? 'text-blue-600'
                              : log.type === 'status_change'
                                ? 'text-green-600'
                                : log.type === 'venue_change'
                                  ? 'text-purple-600'
                                  : log.type === 'date_change'
                                    ? 'text-orange-600'
                                    : log.type === 'rating_change'
                                      ? 'text-yellow-600'
                                      : 'text-gray-600'
                          }`}
                        >
                          {log.adminUser.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {log.adminUser.username}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(log.createdAt)
                              .toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' })
                              .replace('T', ' ')}
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
                  disabled={isSubmittingComment}
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

        {/* 戻るリンク */}
        <div className="pt-4">
          <Link
            href="/admin/black/matchings"
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
            マッチング一覧に戻る
          </Link>
        </div>
      </div>

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">削除の確認</h3>
            <p className="text-sm text-gray-600 mb-6">
              {matching.maleUser.lastName} {matching.maleUser.firstName} ×{' '}
              {matching.femaleUser.lastName} {matching.femaleUser.firstName}{' '}
              のマッチングを削除しますか？
              <br />
              <span className="text-red-600">この操作は取り消せません。</span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                disabled={isDeleting}
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? '削除中...' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* フィードバック入力モーダル */}
      {showFeedbackModal && matching && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-12 overflow-y-auto"
          onClick={closeFeedbackModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-xl mx-4 mb-12 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">フィードバック登録</h3>

            {feedbackError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {feedbackError}
              </div>
            )}

            <div className="space-y-4">
              {/* ユーザー選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  評価するユーザー <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleFeedbackUserChange(matching.maleUserId)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      feedbackUserId === matching.maleUserId
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {matching.maleUser.lastName} {matching.maleUser.firstName}
                    <span className="block text-xs text-gray-500 mt-0.5">男性</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedbackUserChange(matching.femaleUserId)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      feedbackUserId === matching.femaleUserId
                        ? 'bg-pink-100 border-pink-500 text-pink-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {matching.femaleUser.lastName} {matching.femaleUser.firstName}
                    <span className="block text-xs text-gray-500 mt-0.5">女性</span>
                  </button>
                </div>
              </div>

              {/* フィードバック内容 */}
              <div className={!feedbackUserId ? 'opacity-50' : ''}>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {feedbackUserId === matching.maleUserId
                      ? `${matching.maleUser.lastName} ${matching.maleUser.firstName}への感想`
                      : feedbackUserId === matching.femaleUserId
                        ? `${matching.femaleUser.lastName} ${matching.femaleUser.firstName}への感想`
                        : '感想'}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  {!feedbackUserId && (
                    <span className="text-xs text-gray-400">ユーザーを選択してください</span>
                  )}
                </div>
                <textarea
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  disabled={!feedbackUserId}
                  placeholder={
                    feedbackUserId
                      ? 'お相手の印象、デートの様子など...'
                      : 'ユーザーを選択すると入力できます'
                  }
                  rows={10}
                  className={`w-full px-3 py-2 border rounded-lg text-sm resize-none ${
                    !feedbackUserId
                      ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {/* AI補完ボタン */}
                {feedbackUserId && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={handleExtractCriteria}
                      disabled={isExtracting || !feedbackContent.trim()}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isExtracting || !feedbackContent.trim()
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      }`}
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
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      {isExtracting ? 'AI分析中...' : 'AIで補完'}
                    </button>
                  </div>
                )}
              </div>

              {/* 評価観点・評価セクション（AI補完後にアクティブ化） */}
              {criteriaTypes.length > 0 && feedbackUserId && (
                <div
                  className={`border-t border-gray-200 pt-4 mt-4 ${!hasExtractedCriteria ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700">評価観点</h4>
                    {!hasExtractedCriteria && (
                      <span className="text-xs text-gray-400">
                        {Object.keys(originalCriteria).length > 0 ? '既存データあり・' : ''}
                        感想入力後「AIで補完」を実行で編集可能
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {criteriaTypes.map((ct) => {
                      const extracted = extractedCriteria.find((e) => e.criteriaTypeId === ct.id);
                      const options = ct.options as {
                        min?: number;
                        max?: number;
                        labels?: Record<string, string>;
                        choices?: string[];
                      } | null;
                      const originalValue = originalCriteria[ct.id];
                      const currentValue = feedbackCriteria[ct.id];
                      const isAiSuggested = extracted && extracted.confidence !== 'low';
                      const isDifferentFromOriginal =
                        originalValue && currentValue && originalValue !== currentValue;

                      return (
                        <div key={ct.id} className="flex items-start gap-3">
                          <div className="w-32 flex-shrink-0 pt-1">
                            <span className="text-sm text-gray-700">{ct.name}</span>
                            {isAiSuggested && (
                              <span
                                className={`ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${
                                  extracted.confidence === 'high'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-purple-50 text-purple-600'
                                }`}
                              >
                                <svg
                                  className="w-3 h-3"
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
                                AI
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            {ct.fieldType === 'rating' ? (
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((n) => {
                                  const isSelected = feedbackCriteria[ct.id] === n.toString();
                                  return (
                                    <button
                                      key={n}
                                      type="button"
                                      disabled={!hasExtractedCriteria}
                                      onClick={() =>
                                        setFeedbackCriteria((prev) => ({
                                          ...prev,
                                          [ct.id]: prev[ct.id] === n.toString() ? '' : n.toString(),
                                        }))
                                      }
                                      className={`w-8 h-8 rounded border text-xs font-medium transition-colors ${
                                        !hasExtractedCriteria
                                          ? isSelected
                                            ? 'bg-gray-200 border-gray-400 text-gray-600 cursor-not-allowed'
                                            : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                          : isSelected
                                            ? 'bg-yellow-100 border-yellow-500 text-yellow-700'
                                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                      }`}
                                    >
                                      {n}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : ct.fieldType === 'choice' && options?.choices ? (
                              <div className="flex gap-2 flex-wrap">
                                {options.choices.map((choice) => {
                                  const isSelected = feedbackCriteria[ct.id] === choice;
                                  return (
                                    <button
                                      key={choice}
                                      type="button"
                                      disabled={!hasExtractedCriteria}
                                      onClick={() =>
                                        setFeedbackCriteria((prev) => ({
                                          ...prev,
                                          [ct.id]: prev[ct.id] === choice ? '' : choice,
                                        }))
                                      }
                                      className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
                                        !hasExtractedCriteria
                                          ? isSelected
                                            ? 'bg-gray-200 border-gray-400 text-gray-600 cursor-not-allowed'
                                            : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                          : isSelected
                                            ? 'bg-blue-100 border-blue-500 text-blue-700'
                                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                      }`}
                                    >
                                      {choice}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <input
                                type="text"
                                disabled={!hasExtractedCriteria}
                                value={feedbackCriteria[ct.id] || ''}
                                onChange={(e) =>
                                  setFeedbackCriteria((prev) => ({
                                    ...prev,
                                    [ct.id]: e.target.value,
                                  }))
                                }
                                className={`w-full px-2 py-1.5 border rounded text-sm ${
                                  !hasExtractedCriteria
                                    ? feedbackCriteria[ct.id]
                                      ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed'
                                      : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                    : 'border-gray-300'
                                }`}
                              />
                            )}
                            {/* 既存値との差分表示 */}
                            {isDifferentFromOriginal && hasExtractedCriteria && (
                              <div className="mt-1 text-xs text-orange-600 flex items-center gap-1">
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                  />
                                </svg>
                                既存: {originalValue}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 評価（総合評価） */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-start gap-3">
                      <div className="w-32 flex-shrink-0 pt-1">
                        <span className="text-sm text-gray-700">総合評価</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((n) => {
                            const isSelected = feedbackRating === n;
                            return (
                              <button
                                key={n}
                                type="button"
                                disabled={!hasExtractedCriteria}
                                onClick={() => setFeedbackRating(feedbackRating === n ? null : n)}
                                className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                                  !hasExtractedCriteria
                                    ? isSelected
                                      ? 'bg-gray-200 border-gray-400 text-gray-600 cursor-not-allowed'
                                      : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                    : isSelected
                                      ? 'bg-yellow-100 border-yellow-500 text-yellow-700'
                                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {n}
                              </button>
                            );
                          })}
                          <span className="self-center text-sm text-gray-500 ml-2">
                            {feedbackRating !== null ? `${feedbackRating}/5` : '未選択'}
                          </span>
                        </div>
                        {/* 既存評価との差分表示 */}
                        {originalRating !== null &&
                          feedbackRating !== null &&
                          originalRating !== feedbackRating &&
                          hasExtractedCriteria && (
                            <div className="mt-1 text-xs text-orange-600 flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                              </svg>
                              既存: {originalRating}/5
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeFeedbackModal}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                disabled={isSubmittingFeedback}
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={isSubmittingFeedback || !feedbackUserId || !feedbackContent.trim()}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isSubmittingFeedback || !feedbackUserId || !feedbackContent.trim()
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSubmittingFeedback ? '登録中...' : '登録'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
