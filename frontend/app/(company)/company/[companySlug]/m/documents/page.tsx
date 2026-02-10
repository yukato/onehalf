'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { companyApi } from '@/lib/company-api';
import { ModuleHeader } from '@/components/modules/ModuleHeader';
import { DocumentList } from '@/components/documents/DocumentList';
import { DocumentTagFilter } from '@/components/documents/DocumentTagFilter';
import { DocumentTagManager } from '@/components/documents/DocumentTagManager';
import { DocumentUploadModal } from '@/components/documents/DocumentUploadModal';
import { DocumentSearchResults } from '@/components/documents/DocumentSearchResults';
import { DocumentChat } from '@/components/documents/DocumentChat';
import { SearchBox } from '@/components/ui/SearchBox';
import type { DocumentItem, DocumentTag, DocumentSearchResult } from '@/types';

const PAGE_SIZE = 50;

export default function CompanyDocumentsPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [tags, setTags] = useState<DocumentTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showUpload, setShowUpload] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);

  const [activeTab, setActiveTab] = useState<'documents' | 'chat'>('documents');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocumentSearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const loadDocuments = useCallback(async (tagId?: string | null, newOffset?: number) => {
    try {
      const res = await companyApi.getDocuments({
        tagId: tagId || undefined,
        limit: PAGE_SIZE,
        offset: newOffset ?? offset,
      });
      setDocuments(res.documents);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }, [offset]);

  const loadTags = useCallback(async () => {
    try {
      const res = await companyApi.getDocumentTags();
      setTags(res.tags);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  }, []);

  // processing 状態のドキュメントがある間はポーリングで更新
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'processing');
    if (!hasProcessing) return;
    const timer = setInterval(() => {
      loadDocuments(selectedTagId, offset);
    }, 3000);
    return () => clearInterval(timer);
  }, [documents, selectedTagId, offset, loadDocuments]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadDocuments(null, 0), loadTags()]);
      setIsLoading(false);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    await companyApi.uploadDocument(file, title, tagIds);
    await loadDocuments(selectedTagId, 0);
    setOffset(0);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この書類を削除しますか？')) return;
    await companyApi.deleteDocument(id);
    await loadDocuments(selectedTagId, offset);
  };

  const handleEdit = (doc: DocumentItem) => {
    setEditingDoc(doc);
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    await companyApi.updateDocument(editingDoc.id, {
      title: editingDoc.title,
      tagIds: editingDoc.tags.map((t) => t.id),
    });
    setEditingDoc(null);
    await loadDocuments(selectedTagId, offset);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearchError(null);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await companyApi.searchDocuments(searchQuery.trim());
      setSearchResults(res.results);
    } catch (err) {
      const message = err instanceof Error ? err.message : '検索に失敗しました';
      setSearchError(message);
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Tag management handlers
  const handleCreateTag = async (data: { name: string; slug: string; color: string }) => {
    await companyApi.createDocumentTag(data);
    await loadTags();
  };

  const handleUpdateTag = async (id: string, data: { name?: string; color?: string }) => {
    await companyApi.updateDocumentTag(id, data);
    await loadTags();
  };

  const handleDeleteTag = async (id: string) => {
    await companyApi.deleteDocumentTag(id);
    await loadTags();
    if (selectedTagId === id) {
      setSelectedTagId(null);
      await loadDocuments(null, 0);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="h-12 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${activeTab === 'chat' ? 'w-full h-full flex flex-col' : ''}`}>
      <ModuleHeader
        moduleName="書類管理"
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

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'documents'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          ドキュメント
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'chat'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          AIチャット
        </button>
      </div>

      {activeTab === 'chat' ? (
        <DocumentChat companySlug={companySlug} apiType="company" />
      ) : (
      <>
      {/* Search bar */}
      <SearchBox
        value={searchQuery}
        onChange={setSearchQuery}
        onSubmit={handleSearch}
        placeholder="AI検索: 書類の内容を自然言語で検索..."
        isLoading={isSearching}
        className="mb-1"
      />
      {searchError && (
        <p className="text-sm text-red-500 mb-4">{searchError}</p>
      )}
      <div className="mb-3" />

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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light"
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
  );
}
