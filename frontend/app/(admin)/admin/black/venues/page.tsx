'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/PageLayout';
import { SearchBox } from '@/components/ui/SearchBox';
import { api } from '@/lib/api';
import type {
  AdminUser,
  MatchingVenue,
  CreateMatchingVenueRequest,
  UpdateMatchingVenueRequest,
  Prefecture,
} from '@/types';

export default function VenuesPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [venues, setVenues] = useState<MatchingVenue[]>([]);
  const [total, setTotal] = useState(0);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [prefectures, setPrefectures] = useState<Prefecture[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 検索・フィルタ
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [filterPrefecture, setFilterPrefecture] = useState<string>('');
  const [filterGenre, setFilterGenre] = useState<string>('');
  const [genres, setGenres] = useState<string[]>([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState<MatchingVenue | null>(null);
  const [formData, setFormData] = useState<CreateMatchingVenueRequest>({
    name: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingVenue, setDeletingVenue] = useState<MatchingVenue | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (api.getAccessToken()) {
        setIsAuthenticated(true);
        setCurrentUser(api.getCurrentUser());
        await Promise.all([loadVenuesAndGenres(), loadPrefectures()]);
        setIsLoading(false);
        return;
      }

      try {
        await api.refresh();
        setIsAuthenticated(true);
        const user = await api.getMe();
        setCurrentUser(user);
        await Promise.all([loadVenuesAndGenres(), loadPrefectures()]);
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // 初回ロード時にジャンル一覧も取得
  const loadVenuesAndGenres = async () => {
    try {
      // フィルタなしで全件取得してジャンル一覧を抽出
      const allData = await api.getVenues('', false);
      const uniqueGenres = Array.from(
        new Set(allData.venues.map((v) => v.genre).filter((g): g is string => !!g))
      ).sort();
      setGenres(uniqueGenres);

      // 表示用データは条件付きで取得
      const data = await api.getVenues(searchQuery, !showInactive, {
        prefectureId: filterPrefecture,
        genre: filterGenre,
      });
      setVenues(data.venues);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load venues');
    }
  };

  const loadVenues = async (
    search?: string,
    activeOnly?: boolean,
    filters?: { prefectureId?: string; genre?: string }
  ) => {
    try {
      const currentFilters = filters ?? {
        prefectureId: filterPrefecture,
        genre: filterGenre,
      };
      const data = await api.getVenues(
        search ?? searchQuery,
        activeOnly ?? !showInactive,
        currentFilters
      );
      setVenues(data.venues);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load venues');
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

  const handleSearch = () => {
    loadVenues(searchQuery, !showInactive, { prefectureId: filterPrefecture, genre: filterGenre });
  };

  const handleLogout = async () => {
    await api.logout();
    router.push('/admin/login');
  };

  const openCreateModal = () => {
    setEditingVenue(null);
    setFormData({
      name: '',
      genre: '',
      phoneNumber: '',
      postalCode: '',
      prefectureId: undefined,
      city: '',
      address: '',
      googleMapUrl: '',
      url: '',
      notes: '',
      isActive: true,
    });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (venue: MatchingVenue) => {
    setEditingVenue(venue);
    setFormData({
      name: venue.name,
      genre: venue.genre || '',
      phoneNumber: venue.phoneNumber || '',
      postalCode: venue.postalCode || '',
      prefectureId: venue.prefectureId || undefined,
      city: venue.city || '',
      address: venue.address || '',
      googleMapUrl: venue.googleMapUrl || '',
      url: venue.url || '',
      notes: venue.notes || '',
      isActive: venue.isActive,
    });
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingVenue(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      if (editingVenue) {
        const updateData: UpdateMatchingVenueRequest = {
          name: formData.name,
          genre: formData.genre || undefined,
          phoneNumber: formData.phoneNumber || undefined,
          postalCode: formData.postalCode || undefined,
          prefectureId: formData.prefectureId || undefined,
          city: formData.city || undefined,
          address: formData.address || undefined,
          googleMapUrl: formData.googleMapUrl || undefined,
          url: formData.url || undefined,
          notes: formData.notes || undefined,
          isActive: formData.isActive,
        };
        await api.updateVenue(editingVenue.id, updateData);
      } else {
        await api.createVenue(formData);
      }
      closeModal();
      await loadVenues();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (venue: MatchingVenue) => {
    setDeletingVenue(venue);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingVenue) return;

    setIsDeleting(true);
    try {
      await api.deleteVenue(deletingVenue.id);
      setShowDeleteConfirm(false);
      setDeletingVenue(null);
      await loadVenues();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const getPrefectureName = (prefectureId: number | null): string => {
    if (!prefectureId) return '-';
    return prefectures.find((p) => p.id === prefectureId)?.name || '-';
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

  return (
    <PageLayout
      currentPage="black-venues"
      title="レストラン"
      currentUser={currentUser}
      onLogout={handleLogout}
      headerActions={
        <button
          onClick={openCreateModal}
          className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規追加
        </button>
      }
    >
      <div className="space-y-4">
        {/* 検索・フィルタ */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <SearchBox
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSearch}
            placeholder="店名、ジャンル、地域で検索..."
          />

          {/* フィルタ */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filterPrefecture}
              onChange={(e) => {
                const val = e.target.value;
                setFilterPrefecture(val);
                loadVenues(searchQuery, !showInactive, { prefectureId: val, genre: filterGenre });
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            >
              <option value="">都道府県: すべて</option>
              {prefectures.map((p) => (
                <option key={p.id} value={p.id.toString()}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={filterGenre}
              onChange={(e) => {
                const val = e.target.value;
                setFilterGenre(val);
                loadVenues(searchQuery, !showInactive, {
                  prefectureId: filterPrefecture,
                  genre: val,
                });
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            >
              <option value="">ジャンル: すべて</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 px-3 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => {
                  setShowInactive(e.target.checked);
                  loadVenues(searchQuery, !e.target.checked, {
                    prefectureId: filterPrefecture,
                    genre: filterGenre,
                  });
                }}
                className="rounded border-gray-300 text-primary focus:ring-primary/50"
              />
              非アクティブも表示
            </label>

            {(filterPrefecture || filterGenre) && (
              <button
                onClick={() => {
                  setFilterPrefecture('');
                  setFilterGenre('');
                  loadVenues(searchQuery, !showInactive, { prefectureId: '', genre: '' });
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                クリア
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="text-sm text-gray-500">{total} 件</div>

        {/* Venues table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  店名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ジャンル
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  エリア
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  電話番号
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  リンク
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {venues.map((venue) => (
                <tr key={venue.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900">{venue.name}</div>
                    {venue.notes && (
                      <div className="text-xs text-gray-500 truncate max-w-xs" title={venue.notes}>
                        {venue.notes}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {venue.genre || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{getPrefectureName(venue.prefectureId)}</div>
                    {venue.city && <div className="text-xs text-gray-400">{venue.city}</div>}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {venue.phoneNumber || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      {venue.googleMapUrl && (
                        <a
                          href={venue.googleMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="Google Map"
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
                        </a>
                      )}
                      {venue.url && (
                        <a
                          href={venue.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="Webサイト"
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
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      )}
                      {!venue.googleMapUrl && !venue.url && '-'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        venue.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {venue.isActive ? 'アクティブ' : '非アクティブ'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEditModal(venue)}
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
                        onClick={() => handleDeleteClick(venue)}
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
              ))}
              {venues.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    レストランが見つかりません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-12 overflow-y-auto"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 mb-12 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingVenue ? 'レストラン編集' : '新規レストラン'}
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
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    店名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                    placeholder="レストラン名"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ジャンル</label>
                    <input
                      type="text"
                      value={formData.genre || ''}
                      onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                      placeholder="イタリアン、和食など"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                    <input
                      type="tel"
                      value={formData.phoneNumber || ''}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                      placeholder="03-1234-5678"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">郵便番号</label>
                    <input
                      type="text"
                      value={formData.postalCode || ''}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                      placeholder="123-4567"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                    >
                      <option value="">選択</option>
                      {prefectures.map((pref) => (
                        <option key={pref.id} value={pref.id}>
                          {pref.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">市区町村</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                      placeholder="渋谷区"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                    placeholder="〇〇町1-2-3 △△ビル5F"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google Map URL
                  </label>
                  <input
                    type="url"
                    value={formData.googleMapUrl || ''}
                    onChange={(e) => setFormData({ ...formData, googleMapUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                    placeholder="https://maps.google.com/..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Webサイト URL
                  </label>
                  <input
                    type="url"
                    value={formData.url || ''}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                    placeholder="https://tabelog.com/..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                    rows={3}
                    placeholder="予約方法、特記事項など"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive ?? true}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-primary focus:ring-primary/50"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">
                    アクティブ（マッチングで選択可能）
                  </label>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formData.name?.trim()}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isSaving || !formData.name?.trim()
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary-dark'
                  }`}
                >
                  {isSaving ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingVenue && (
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
              「{deletingVenue.name}」を削除しますか？この操作は取り消せません。
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
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? '削除中...' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
