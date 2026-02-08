'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { PageLayout } from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { formatActivityLogDate } from '@/lib/utils';
import type {
  AdminUser,
  User,
  UpdateUserRequest,
  Occupation,
  Plan,
  Prefecture,
  UserStatusCode,
  UserActivityLog,
  UserFile,
  ExtractedProfileValue,
  ExtractedBasicInfo,
} from '@/types';
import { FileUploadModal } from '@/components/FileUploadModal';
import { UserPreferencesEditor } from '@/components/UserPreferencesEditor';
import { UserAttributesEditor } from '@/components/UserAttributesEditor';
import { UserAvailabilityPatternEditor } from '@/components/UserAvailabilityPatternEditor';
import { ProfileExtractorModal } from '@/components/ProfileExtractorModal';

// タブの定義
type UserTab = 'files' | 'attributes' | 'preferences' | 'availability';

const USER_TABS: { id: UserTab; label: string }[] = [
  { id: 'files', label: '画像・ファイル' },
  { id: 'attributes', label: 'プロフィール属性' },
  { id: 'preferences', label: '希望条件' },
  { id: 'availability', label: '希望時間' },
];

// ファイル種別の定義
const FILE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  profile: { label: 'プロフィール', color: 'bg-blue-100 text-blue-700' },
  interview: { label: '面談', color: 'bg-purple-100 text-purple-700' },
  kyc: { label: 'KYC', color: 'bg-orange-100 text-orange-700' },
  date_hearing: { label: 'デートヒアリング', color: 'bg-green-100 text-green-700' },
};

// ステータスの定義
const USER_STATUSES: { code: UserStatusCode; label: string }[] = [
  { code: 'pending', label: '審査中' },
  { code: 'approved', label: '承認済' },
  { code: 'withdrawn', label: '退会済' },
  { code: 'suspended', label: '停止中' },
];

// ステータスコード→ラベル
function getStatusLabel(status: UserStatusCode): string {
  return USER_STATUSES.find((s) => s.code === status)?.label || status;
}

// ステータスの色
function getStatusColor(status: UserStatusCode): string {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'withdrawn':
      return 'bg-gray-100 text-gray-800';
    case 'suspended':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// 性別の表示
function getGenderLabel(gender: number): string {
  return gender === 1 ? '男性' : gender === 2 ? '女性' : '不明';
}

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

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [prefectures, setPrefectures] = useState<Prefecture[]>([]);
  const [error, setError] = useState<string | null>(null);

  // タブ
  const [activeTab, setActiveTab] = useState<UserTab>('files');

  // 編集モード
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateUserRequest>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 削除確認
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // アクティビティログ
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  // ファイル管理
  const [profileFiles, setProfileFiles] = useState<UserFile[]>([]);
  const [otherFiles, setOtherFiles] = useState<UserFile[]>([]); // interview, kyc, date_hearing
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [fileModalType, setFileModalType] = useState<'profile' | 'other' | null>(null);

  // AIプロフィール抽出モーダル
  const [showProfileExtractor, setShowProfileExtractor] = useState(false);
  // 属性・希望条件エディタの再読み込み用キー
  const [editorRefreshKey, setEditorRefreshKey] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      if (api.getAccessToken()) {
        setIsAuthenticated(true);
        setCurrentUser(api.getCurrentUser());
        await Promise.all([
          loadUser(),
          loadOccupations(),
          loadPlans(),
          loadPrefectures(),
          loadActivityLogs(),
          loadUserFiles(),
        ]);
        setIsLoading(false);
        return;
      }

      try {
        await api.refresh();
        setIsAuthenticated(true);
        const adminUser = await api.getMe();
        setCurrentUser(adminUser);
        await Promise.all([
          loadUser(),
          loadOccupations(),
          loadPlans(),
          loadPrefectures(),
          loadActivityLogs(),
          loadUserFiles(),
        ]);
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, userId]);

  const loadUser = async () => {
    try {
      const data = await api.getUser(userId);
      setUser(data);
      setFormData({
        lastName: data.lastName,
        firstName: data.firstName,
        gender: data.gender,
        email: data.email,
        mobileNumber: data.mobileNumber || undefined,
        birthday: data.birthday?.split('T')[0] || undefined,
        occupationId: data.occupationId || undefined,
        prefectureId: data.prefectureId || undefined,
        currentStatus: data.currentStatus,
        planId: data.planId || undefined,
        score: data.score,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザーの読み込みに失敗しました');
    }
  };

  const loadOccupations = async () => {
    try {
      const data = await api.getOccupations();
      setOccupations(data.occupations);
    } catch (err) {
      console.error('Failed to load occupations:', err);
    }
  };

  const loadPlans = async () => {
    try {
      const data = await api.getPlans();
      setPlans(data.plans);
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  const loadPrefectures = async () => {
    try {
      const data = await api.getPrefectures();
      setPrefectures(data);
    } catch (err) {
      console.error('Failed to load prefectures:', err);
    }
  };

  const loadActivityLogs = async () => {
    try {
      const data = await api.getUserActivityLogs(userId);
      setActivityLogs(data.logs);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    }
  };

  const loadUserFiles = async () => {
    try {
      const [profile, others] = await Promise.all([
        api.getUserFiles(userId, 'profile'),
        api.getUserFiles(userId), // 全件取得
      ]);
      setProfileFiles(profile.files);
      // profile以外をフィルタ
      setOtherFiles(others.files.filter((f) => f.type !== 'profile'));
    } catch (err) {
      console.error('Failed to load user files:', err);
    }
  };

  const handleFileUpload = async (file: File, type: string) => {
    setUploadingType(type);
    try {
      const isPrimary = type === 'profile' && profileFiles.length === 0;
      const newFile = await api.uploadUserFile(userId, file, type, isPrimary);
      if (type === 'profile') {
        setProfileFiles([...profileFiles, newFile]);
      } else {
        setOtherFiles([...otherFiles, newFile]);
      }
      setFileModalType(null);
    } catch (err) {
      console.error('Failed to upload file:', err);
      throw err;
    } finally {
      setUploadingType(null);
    }
  };

  const handleUrlRegister = async (url: string, type: string) => {
    setUploadingType(type);
    try {
      const newFile = await api.registerUserFileUrl(userId, url, type, false);
      setOtherFiles([...otherFiles, newFile]);
      setFileModalType(null);
    } catch (err) {
      console.error('Failed to register URL:', err);
      throw err;
    } finally {
      setUploadingType(null);
    }
  };

  const handleDeleteFile = async (fileId: string, type: string) => {
    setDeletingFileId(fileId);
    try {
      await api.deleteUserFile(userId, fileId);
      if (type === 'profile') {
        setProfileFiles(profileFiles.filter((f) => f.id !== fileId));
      } else {
        setOtherFiles(otherFiles.filter((f) => f.id !== fileId));
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleSetPrimary = async (fileId: string) => {
    try {
      await api.updateUserFilePrimary(userId, fileId);
      setProfileFiles(
        profileFiles.map((f) => ({
          ...f,
          isPrimary: f.id === fileId,
        }))
      );
    } catch (err) {
      console.error('Failed to set primary:', err);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const log = await api.createUserActivityLog(userId, newComment);
      setActivityLogs([log, ...activityLogs]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    // IME変換中はEnterで送信しない
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const handleLogout = async () => {
    await api.logout();
    router.push('/admin/login');
  };

  // 値をフォーマットする関数
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

  // AIプロフィール抽出結果の反映
  const handleApplyExtractedProfile = async (
    selectedBasicInfo: ExtractedBasicInfo[],
    selectedAttributes: ExtractedProfileValue[],
    selectedPreferences: ExtractedProfileValue[],
    inputText: string
  ) => {
    const changeLog: string[] = [];

    // 基本情報を更新
    if (selectedBasicInfo.length > 0 && user) {
      const basicInfoUpdate: UpdateUserRequest = {};
      selectedBasicInfo.forEach((info) => {
        switch (info.field) {
          case 'birthday':
            basicInfoUpdate.birthday = info.suggestedValue as string;
            break;
          case 'occupationId':
            basicInfoUpdate.occupationId = info.suggestedValue as number;
            break;
          case 'prefectureId':
            basicInfoUpdate.prefectureId = info.suggestedValue as number;
            break;
          case 'mobileNumber':
            basicInfoUpdate.mobileNumber = info.suggestedValue as string;
            break;
        }
        changeLog.push(
          `【基本情報】${info.name}: ${formatValue(info.currentValue)} → ${formatValue(info.suggestedValue)}`
        );
      });

      if (Object.keys(basicInfoUpdate).length > 0) {
        const updatedUser = await api.updateUser(user.id, basicInfoUpdate);
        setUser(updatedUser);
      }
    }

    // 属性タイプを取得してIDを解決
    if (selectedAttributes.length > 0) {
      const { attributeTypes } = await api.getAttributeTypes(user?.gender);
      const attributesToSave = selectedAttributes
        .map((attr) => {
          const attrType = attributeTypes.find((t) => t.code === attr.code);
          if (!attrType) {
            console.warn(`Attribute type not found for code: ${attr.code}`);
            return null;
          }
          return {
            attributeTypeId: attrType.id,
            value: attr.suggestedValue as string | string[] | number,
          };
        })
        .filter((a): a is NonNullable<typeof a> => a !== null);

      if (attributesToSave.length > 0) {
        await api.saveUserAttributes(userId, { attributes: attributesToSave });
      }
      // ログ用に変更内容を記録（成功したかどうかに関わらず）
      selectedAttributes.forEach((attr) => {
        changeLog.push(
          `【属性】${attr.name}: ${formatValue(attr.currentValue)} → ${formatValue(attr.suggestedValue)}`
        );
      });
    }

    // 希望条件タイプを取得してIDを解決
    if (selectedPreferences.length > 0) {
      const { preferenceTypes } = await api.getPreferenceTypes(user?.gender);
      const preferencesToSave = selectedPreferences
        .map((pref) => {
          const prefType = preferenceTypes.find((t) => t.code === pref.code);
          if (!prefType) {
            console.warn(`Preference type not found for code: ${pref.code}`);
            return null;
          }
          return {
            preferenceTypeId: prefType.id,
            value: pref.suggestedValue as
              | string
              | string[]
              | { min?: number | null; max?: number | null },
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      if (preferencesToSave.length > 0) {
        await api.saveUserPreferences(userId, { preferences: preferencesToSave });
      }
      // ログ用に変更内容を記録
      selectedPreferences.forEach((pref) => {
        changeLog.push(
          `【希望条件】${pref.name}: ${formatValue(pref.currentValue)} → ${formatValue(pref.suggestedValue)}`
        );
      });
    }

    // アクティビティログに記録
    if (changeLog.length > 0) {
      // 入力テキストを正規化（不要な空白・改行を削除）
      const normalizedText = inputText
        .split('\n')
        .map((line) => line.trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      const logContent = `AIプロフィール抽出により更新:\n\n【入力テキスト】\n${normalizedText}\n\n【変更内容】\n${changeLog.join('\n')}`;
      const log = await api.createUserActivityLog(userId, logContent);
      setActivityLogs([log, ...activityLogs]);
    }

    // ユーザー情報とエディタを再読み込み
    await loadUser();
    setEditorRefreshKey((prev) => prev + 1);
  };

  const handleSave = async () => {
    if (!user) return;

    setFormError(null);
    setIsSaving(true);

    try {
      // 変更内容をログに記録するための比較
      const changes: string[] = [];
      const fieldLabels: Record<string, string> = {
        lastName: '姓',
        firstName: '名',
        gender: '性別',
        email: 'メール',
        mobileNumber: '電話番号',
        birthday: '生年月日',
        occupationId: '職業',
        prefectureId: '都道府県',
        currentStatus: 'ステータス',
        planId: 'プラン',
        score: 'スコア',
      };

      const getDisplayValue = (key: string, value: unknown): string => {
        if (value === undefined || value === null || value === '') return '（未設定）';
        if (key === 'gender') return value === 1 ? '男性' : value === 2 ? '女性' : String(value);
        if (key === 'currentStatus') return getStatusLabel(value as UserStatusCode);
        if (key === 'occupationId')
          return occupations.find((o) => o.id === value)?.name || String(value);
        if (key === 'prefectureId')
          return prefectures.find((p) => p.id === value)?.name || String(value);
        if (key === 'planId') return plans.find((p) => p.id === value)?.name || String(value);
        return String(value);
      };

      // 各フィールドの変更を検出
      Object.keys(formData).forEach((key) => {
        const typedKey = key as keyof UpdateUserRequest;
        const oldValue =
          key === 'birthday'
            ? user.birthday?.split('T')[0] || undefined
            : (user as unknown as Record<string, unknown>)[key];
        const newValue = formData[typedKey];

        if (oldValue !== newValue) {
          const label = fieldLabels[key] || key;
          const oldDisplay = getDisplayValue(key, oldValue);
          const newDisplay = getDisplayValue(key, newValue);
          changes.push(`${label}: ${oldDisplay} → ${newDisplay}`);
        }
      });

      const updatedUser = await api.updateUser(user.id, formData);
      setUser(updatedUser);
      setIsEditing(false);

      // 変更があればアクティビティログに記録
      if (changes.length > 0) {
        const logContent = `基本情報を更新:\n${changes.join('\n')}`;
        const log = await api.createUserActivityLog(userId, logContent);
        setActivityLogs([log, ...activityLogs]);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        lastName: user.lastName,
        firstName: user.firstName,
        gender: user.gender,
        email: user.email,
        mobileNumber: user.mobileNumber || undefined,
        birthday: user.birthday?.split('T')[0] || undefined,
        occupationId: user.occupationId || undefined,
        prefectureId: user.prefectureId || undefined,
        currentStatus: user.currentStatus,
        planId: user.planId || undefined,
        score: user.score,
      });
    }
    setFormError(null);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      await api.deleteUser(user.id);
      router.push('/admin/black/users');
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

  if (!isAuthenticated) {
    return null;
  }

  if (!user) {
    return (
      <PageLayout
        currentPage="black-users"
        title="ユーザー詳細"
        currentUser={currentUser}
        onLogout={handleLogout}
      >
        <div className="p-8 text-center text-gray-500">{error || 'ユーザーが見つかりません'}</div>
      </PageLayout>
    );
  }

  const age = calculateAge(user.birthday);

  // タブコンテンツのレンダリング
  const renderTabContent = () => {
    switch (activeTab) {
      case 'files':
        return (
          <div className="space-y-4">
            {/* プロフィール画像 */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">プロフィール画像</h3>
                <button
                  onClick={() => setFileModalType('profile')}
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
              </div>
              <div className="p-6">
                {profileFiles.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">まだ画像がありません</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {profileFiles.map((userFile) => (
                      <div key={userFile.id} className="relative group">
                        <div
                          className={`aspect-square rounded-lg overflow-hidden border-2 ${userFile.isPrimary ? 'border-blue-500' : 'border-gray-200'}`}
                        >
                          <img
                            src={userFile.url}
                            alt={userFile.file.originalName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {userFile.isPrimary && (
                          <span className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded">
                            メイン
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          {!userFile.isPrimary && (
                            <button
                              onClick={() => handleSetPrimary(userFile.id)}
                              className="p-1.5 bg-white rounded-full text-blue-600 hover:bg-blue-50"
                              title="メインに設定"
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
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteFile(userFile.id, 'profile')}
                            disabled={deletingFileId === userFile.id}
                            className="p-1.5 bg-white rounded-full text-red-600 hover:bg-red-50 disabled:opacity-50"
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 関連ファイル（面談・KYC・ヒアリング） */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">関連ファイル</h3>
                <button
                  onClick={() => setFileModalType('other')}
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
              </div>
              <div className="p-6">
                {otherFiles.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">まだファイルがありません</p>
                ) : (
                  <div className="space-y-2">
                    {otherFiles.map((userFile) => {
                      const typeInfo = FILE_TYPE_LABELS[userFile.type] || {
                        label: userFile.type,
                        color: 'bg-gray-100 text-gray-700',
                      };
                      return (
                        <div
                          key={userFile.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group"
                        >
                          {/* 種別ラベル */}
                          <span
                            className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded ${typeInfo.color}`}
                          >
                            {typeInfo.label}
                          </span>
                          {/* ファイル名 */}
                          <div className="flex-1 min-w-0">
                            <a
                              href={userFile.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block"
                            >
                              {userFile.file.originalName}
                            </a>
                          </div>
                          {/* 登録日時 */}
                          <span className="flex-shrink-0 text-xs text-gray-400">
                            {formatActivityLogDate(userFile.createdAt)}
                          </span>
                          {/* 削除ボタン */}
                          <button
                            onClick={() => handleDeleteFile(userFile.id, userFile.type)}
                            disabled={deletingFileId === userFile.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
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
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'attributes':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div />
              <button
                onClick={() => setShowProfileExtractor(true)}
                className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                AIで入力補助
              </button>
            </div>
            <UserAttributesEditor
              key={`attr-${editorRefreshKey}`}
              userId={userId}
              userGender={user.gender}
            />
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div />
              <button
                onClick={() => setShowProfileExtractor(true)}
                className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                AIで入力補助
              </button>
            </div>
            <UserPreferencesEditor
              key={`pref-${editorRefreshKey}`}
              userId={userId}
              userGender={user.gender}
            />
          </div>
        );

      case 'availability':
        return <UserAvailabilityPatternEditor userId={userId} />;

      default:
        return null;
    }
  };

  return (
    <PageLayout
      currentPage="black-users"
      title="ユーザー詳細"
      currentUser={currentUser}
      onLogout={handleLogout}
      headerActions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProfileExtractor(true)}
            className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            AIで入力
          </button>
          <Link
            href={`/admin/black/users/${userId}/create-matching`}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
          >
            マッチング作成
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1.5 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors"
          >
            削除
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* パンくずリスト */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin/black/users" className="hover:text-blue-600">
            ユーザー管理
          </Link>
          <span>/</span>
          <span className="text-gray-900">
            {user.lastName} {user.firstName}
          </span>
        </div>

        {/* エラー表示 */}
        {(error || formError) && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error || formError}
          </div>
        )}

        {/* ユーザー情報カード（常に表示） */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* ヘッダー */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {user.lastName} {user.firstName}
                  </h2>
                  <p className="text-sm text-gray-500">BD User ID: {user.bdUserId}</p>
                </div>
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(user.currentStatus)}`}
                >
                  {getStatusLabel(user.currentStatus)}
                </span>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  編集
                </button>
              )}
            </div>
          </div>

          {/* 詳細情報 */}
          <div className="p-6">
            {!isEditing ? (
              // 表示モード
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">基本情報</h4>
                  <dl className="space-y-3">
                    <div className="flex">
                      <dt className="w-24 text-sm text-gray-500">性別</dt>
                      <dd className="text-sm text-gray-900">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                            user.gender === 1
                              ? 'bg-blue-100 text-blue-700'
                              : user.gender === 2
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {getGenderLabel(user.gender)}
                        </span>
                      </dd>
                    </div>
                    <div className="flex">
                      <dt className="w-24 text-sm text-gray-500">生年月日</dt>
                      <dd className="text-sm text-gray-900">
                        {user.birthday ? `${user.birthday.split('T')[0]} (${age}歳)` : '-'}
                      </dd>
                    </div>
                    <div className="flex">
                      <dt className="w-24 text-sm text-gray-500">メール</dt>
                      <dd className="text-sm text-gray-900">{user.email}</dd>
                    </div>
                    <div className="flex">
                      <dt className="w-24 text-sm text-gray-500">電話番号</dt>
                      <dd className="text-sm text-gray-900">{user.mobileNumber || '-'}</dd>
                    </div>
                    <div className="flex">
                      <dt className="w-24 text-sm text-gray-500">都道府県</dt>
                      <dd className="text-sm text-gray-900">{user.prefecture?.name || '-'}</dd>
                    </div>
                    <div className="flex">
                      <dt className="w-24 text-sm text-gray-500">職業</dt>
                      <dd className="text-sm text-gray-900">{user.occupation?.name || '-'}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">会員情報</h4>
                  <dl className="space-y-3">
                    <div className="flex">
                      <dt className="w-24 text-sm text-gray-500">ステータス</dt>
                      <dd className="text-sm">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(user.currentStatus)}`}
                        >
                          {getStatusLabel(user.currentStatus)}
                        </span>
                      </dd>
                    </div>
                    <div className="flex">
                      <dt className="w-24 text-sm text-gray-500">プラン</dt>
                      <dd className="text-sm text-gray-900">{user.plan?.name || '-'}</dd>
                    </div>
                    <div className="flex">
                      <dt className="w-24 text-sm text-gray-500">スコア</dt>
                      <dd className="text-sm text-gray-900">{user.score}</dd>
                    </div>
                    <div className="flex">
                      <dt className="w-24 text-sm text-gray-500">登録日</dt>
                      <dd className="text-sm text-gray-900">
                        {user.createdAt
                          ? formatActivityLogDate(user.createdAt)
                          : '-'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            ) : (
              // 編集モード
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      姓 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName || ''}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName || ''}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      性別 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData({ ...formData, gender: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light text-sm"
                    >
                      <option value={1}>男性</option>
                      <option value={2}>女性</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">生年月日</label>
                    <input
                      type="date"
                      value={formData.birthday || ''}
                      onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                    <input
                      type="tel"
                      value={formData.mobileNumber || ''}
                      onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">都道府県</label>
                    <select
                      value={formData.prefectureId || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prefectureId: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light text-sm"
                    >
                      <option value="">選択してください</option>
                      {prefectures.map((pref) => (
                        <option key={pref.id} value={pref.id}>
                          {pref.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">職業</label>
                    <select
                      value={formData.occupationId || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          occupationId: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light text-sm"
                    >
                      <option value="">選択してください</option>
                      {occupations.map((occ) => (
                        <option key={occ.id} value={occ.id}>
                          {occ.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">プラン</label>
                    <select
                      value={formData.planId || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          planId: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light text-sm"
                    >
                      <option value="">選択してください</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ステータス
                    </label>
                    <select
                      value={formData.currentStatus || 'pending'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentStatus: e.target.value as UserStatusCode,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light text-sm"
                    >
                      {USER_STATUSES.map((status) => (
                        <option key={status.code} value={status.code}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">スコア</label>
                    <select
                      value={formData.score ?? 100}
                      onChange={(e) =>
                        setFormData({ ...formData, score: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light text-sm"
                    >
                      {Array.from({ length: 101 }, (_, i) => 100 - i).map((score) => (
                        <option key={score} value={score}>
                          {score}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 編集モードのボタン */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    disabled={isSaving}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark disabled:opacity-50"
                  >
                    {isSaving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* セカンダリナビゲーション（タブ） */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* タブナビゲーション */}
          <div className="border-b border-gray-200 bg-gray-50">
            <nav className="flex -mb-px">
              {USER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* タブコンテンツ */}
          <div className="p-4">{renderTabContent()}</div>
        </div>

        {/* アクティビティログ（常に表示） */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-base font-semibold text-gray-900">アクティビティログ</h3>
          </div>
          <div className="p-6">
            {/* ログ一覧 */}
            <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
              {activityLogs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">まだログがありません</p>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-xs font-medium">
                        {log.adminUser.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {log.adminUser.username}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatActivityLogDate(log.createdAt)}
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
              <div className="flex gap-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleCommentKeyDown}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  placeholder="コメントを入力..."
                  rows={2}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light text-sm resize-none"
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmittingComment}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors self-end ${
                    !newComment.trim() || isSubmittingComment
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary-dark'
                  }`}
                >
                  {isSubmittingComment ? '送信中...' : '送信'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Shift + Enter で改行、Enter で送信</p>
            </div>
          </div>
        </div>

        {/* 一覧に戻るリンク */}
        <div className="pt-2">
          <Link
            href="/admin/black/users"
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
            一覧に戻る
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">ユーザーを削除</h3>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-medium text-gray-900">
                {user.lastName} {user.firstName}
              </span>{' '}
              を削除してもよろしいですか？
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
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

      {/* ファイル追加モーダル */}
      <FileUploadModal
        isOpen={fileModalType !== null}
        onClose={() => setFileModalType(null)}
        onUpload={handleFileUpload}
        onUrlSubmit={handleUrlRegister}
        isUploading={uploadingType !== null}
        allowedTypes={
          fileModalType === 'profile' ? ['profile'] : ['interview', 'kyc', 'date_hearing']
        }
      />

      {/* AIプロフィール抽出モーダル */}
      <ProfileExtractorModal
        isOpen={showProfileExtractor}
        onClose={() => setShowProfileExtractor(false)}
        userId={userId}
        onApply={handleApplyExtractedProfile}
      />
    </PageLayout>
  );
}
