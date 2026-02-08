'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { ModuleHeader } from '@/components/modules/ModuleHeader';
import { api } from '@/lib/api';
import { DocumentList } from '@/components/documents/DocumentList';
import { DocumentTagFilter } from '@/components/documents/DocumentTagFilter';
import { DocumentTagManager } from '@/components/documents/DocumentTagManager';
import { DocumentUploadModal } from '@/components/documents/DocumentUploadModal';
import { DocumentSearchResults } from '@/components/documents/DocumentSearchResults';
import { SearchBox } from '@/components/ui/SearchBox';
import type { AdminUser, DocumentItem, DocumentTag, DocumentSearchResult } from '@/types';

const PAGE_SIZE = 50;

export default function AdminCompanyDocumentsPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const companySlug = params.companySlug as string;

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [tags, setTags] = useState<DocumentTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  const [showUpload, setShowUpload] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocumentSearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const loadDocuments = useCallback(async (tagId?: string | null, newOffset?: number) => {
    try {
      const res = await api.getCompanyDocuments(companySlug, {
        tagId: tagId || undefined,
        limit: PAGE_SIZE,
        offset: newOffset ?? 0,
      });
      setDocuments(res.documents);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }, [companySlug]);

  const loadTags = useCallback(async () => {
    try {
      const res = await api.getCompanyDocumentTags(companySlug);
      setTags(res.tags);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  }, [companySlug]);

  useEffect(() => {
    const init = async () => {
      try {
        if (!api.getAccessToken()) {
          await api.refresh();
        }
        const user = api.getCurrentUser() || (await api.getMe());
        if (!user) {
          router.push('/admin/login');
          return;
        }
        setCurrentUser(user);

        // 会社名を取得
        const companiesRes = await api.getCompanies();
        const company = companiesRes.companies.find((c) => c.slug === companySlug);
        if (company) {
          setCompanyName(company.name);
        }

        await Promise.all([loadDocuments(null, 0), loadTags()]);
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [router, companySlug, loadDocuments, loadTags]);

  const handleLogout = async () => {
    await api.logout();
    router.push('/admin/login');
  };

  const handleTagSelect = (tagId: string | null) => {
    setSelectedTagId(tagId);
    setOffset(0);
    setSearchResults(null);
    loadDocuments(tagId, 0);
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    loadDocuments(selectedTagId, newOffset);
  };

  const handleUpload = async (file: File, title: string, tagIds: string[]) => {
    await api.uploadCompanyDocument(companySlug, file, title, tagIds);
    await loadDocuments(selectedTagId, 0);
    setOffset(0);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この書類を削除しますか？')) return;
    await api.deleteCompanyDocument(companySlug, id);
    await loadDocuments(selectedTagId, offset);
  };

  const handleEdit = (doc: DocumentItem) => {
    setEditingDoc(doc);
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    await api.updateCompanyDocument(companySlug, editingDoc.id, {
      title: editingDoc.title,
      tagIds: editingDoc.tags.map((t) => t.id),
    });
    setEditingDoc(null);
    await loadDocuments(selectedTagId, offset);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.searchCompanyDocuments(companySlug, searchQuery.trim());
      setSearchResults(res.results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateTag = async (data: { name: string; slug: string; color: string }) => {
    await api.createCompanyDocumentTag(companySlug, data);
    await loadTags();
  };

  const handleUpdateTag = async (id: string, data: { name?: string; color?: string }) => {
    await api.updateCompanyDocumentTag(companySlug, id, data);
    await loadTags();
  };

  const handleDeleteTag = async (id: string) => {
    await api.deleteCompanyDocumentTag(companySlug, id);
    await loadTags();
    if (selectedTagId === id) {
      setSelectedTagId(null);
      await loadDocuments(null, 0);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar currentPage="other" currentPath={pathname} currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ModuleHeader
            moduleName="書類管理"
            companyName={companyName || companySlug}
            icon="document"
            actions={
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                アップロード
              </button>
            }
          />

          {/* Search bar */}
          <SearchBox
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSearch}
            placeholder="AI検索: 書類の内容を自然言語で検索..."
            isLoading={isSearching}
            className="mb-4"
          />

          {/* Search results or document list */}
          {searchResults !== null ? (
            <DocumentSearchResults
              results={searchResults}
              query={searchQuery}
              onClose={() => setSearchResults(null)}
            />
          ) : (
            <>
              {/* Tag filter */}
              <div className="mb-4">
                <DocumentTagFilter
                  tags={tags}
                  selectedTagId={selectedTagId}
                  onSelect={handleTagSelect}
                  onManageTags={() => setShowTagManager(true)}
                />
              </div>

              {/* Document list */}
              <DocumentList
                documents={documents}
                total={total}
                offset={offset}
                limit={PAGE_SIZE}
                onPageChange={handlePageChange}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            </>
          )}

          {/* Upload modal */}
          {showUpload && (
            <DocumentUploadModal
              tags={tags}
              onClose={() => setShowUpload(false)}
              onUpload={handleUpload}
            />
          )}

          {/* Tag manager */}
          {showTagManager && (
            <DocumentTagManager
              tags={tags}
              onClose={() => setShowTagManager(false)}
              onCreate={handleCreateTag}
              onUpdate={handleUpdateTag}
              onDelete={handleDeleteTag}
            />
          )}

          {/* Edit modal */}
          {editingDoc && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingDoc(null)}>
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">書類を編集</h3>
                  <button onClick={() => setEditingDoc(null)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
                    <input
                      type="text"
                      value={editingDoc.title}
                      onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">タグ</label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const isSelected = editingDoc.tags.some((t) => t.id === tag.id);
                        return (
                          <button
                            key={tag.id}
                            onClick={() => {
                              const newTags = isSelected
                                ? editingDoc.tags.filter((t) => t.id !== tag.id)
                                : [...editingDoc.tags, tag];
                              setEditingDoc({ ...editingDoc, tags: newTags });
                            }}
                            className={`px-3 py-1 text-sm rounded-full border transition-colors flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isSelected ? 'white' : tag.color }} />
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                  <button
                    onClick={() => setEditingDoc(null)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
