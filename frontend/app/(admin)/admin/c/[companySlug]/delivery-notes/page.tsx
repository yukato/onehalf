'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { ModuleHeader } from '@/components/modules/ModuleHeader';
import { SearchBox } from '@/components/ui/SearchBox';
import { DeliveryNoteList } from '@/components/delivery-notes/DeliveryNoteList';
const DeliveryNoteDetail = dynamic(() => import('@/components/delivery-notes/DeliveryNoteDetail').then(m => m.DeliveryNoteDetail));
import type { DeliveryNote, DeliveryNoteStatus } from '@/types';

const PAGE_SIZE = 50;

type StatusFilter = 'all' | DeliveryNoteStatus;

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'draft', label: '下書き' },
  { key: 'issued', label: '発行済' },
  { key: 'delivered', label: '納品済' },
  { key: 'confirmed', label: '確認済' },
];

export default function AdminDeliveryNotesPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;

  const [deliveryNotes, setDeliveryNotes] = useState<Omit<DeliveryNote, 'items'>[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [detailDeliveryNote, setDetailDeliveryNote] = useState<DeliveryNote | null>(null);
  const [shareTarget, setShareTarget] = useState<{ id: string; number: string } | null>(null);

  const loadDeliveryNotes = useCallback(async (status?: StatusFilter, query?: string, newOffset?: number) => {
    try {
      const res = await api.getCompanyDeliveryNotes(companySlug, {
        status: status && status !== 'all' ? status : undefined,
        q: query || undefined,
        limit: PAGE_SIZE,
        offset: newOffset ?? offset,
      });
      setDeliveryNotes(res.deliveryNotes);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load delivery notes:', err);
    }
  }, [companySlug, offset]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadDeliveryNotes('all', '', 0);
      setIsLoading(false);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    setOffset(0);
    loadDeliveryNotes(statusFilter, searchQuery, 0);
  };

  const handleStatusChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setOffset(0);
    setSearchQuery('');
    loadDeliveryNotes(status, '', 0);
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    loadDeliveryNotes(statusFilter, searchQuery, newOffset);
  };

  const handleEdit = async (deliveryNote: Omit<DeliveryNote, 'items'>) => {
    try {
      const full = await api.getCompanyDeliveryNote(companySlug, deliveryNote.id);
      setDetailDeliveryNote(full);
    } catch (err) {
      console.error('Failed to load delivery note detail:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この納品書を削除しますか？')) return;
    try {
      await api.deleteCompanyDeliveryNote(companySlug, id);
      await loadDeliveryNotes(statusFilter, searchQuery, offset);
    } catch (err) {
      console.error('Failed to delete delivery note:', err);
    }
  };

  const handleShare = (deliveryNote: Omit<DeliveryNote, 'items'>) => {
    setShareTarget({ id: deliveryNote.id, number: deliveryNote.deliveryNumber });
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.updateCompanyDeliveryNoteStatus(companySlug, id, status);
      await loadDeliveryNotes(statusFilter, searchQuery, offset);
      if (detailDeliveryNote && detailDeliveryNote.id === id) {
        const updated = await api.getCompanyDeliveryNote(companySlug, id);
        setDetailDeliveryNote(updated);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ModuleHeader moduleName="納品書" icon="truck" />

      {/* Status Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleStatusChange(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <SearchBox
        value={searchQuery}
        onChange={setSearchQuery}
        onSubmit={handleSearch}
        placeholder="納品番号・受注番号・取引先名で検索..."
        submitLabel="検索"
        className="mb-4"
      />

      {/* Delivery Note List */}
      <DeliveryNoteList
        deliveryNotes={deliveryNotes}
        total={total}
        offset={offset}
        limit={PAGE_SIZE}
        onPageChange={handlePageChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onShare={handleShare}
        onStatusChange={handleStatusUpdate}
      />

      {/* Detail Modal */}
      {detailDeliveryNote && (
        <DeliveryNoteDetail
          deliveryNote={detailDeliveryNote}
          onClose={() => setDetailDeliveryNote(null)}
          onShare={() => {
            setShareTarget({ id: detailDeliveryNote.id, number: detailDeliveryNote.deliveryNumber });
          }}
          onStatusChange={(status) => handleStatusUpdate(detailDeliveryNote.id, status)}
        />
      )}

      {/* Share Link Modal */}
      {shareTarget && (
        <ShareLinkModal
          targetId={shareTarget.id}
          targetNumber={shareTarget.number}
          linkType="delivery_note"
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}

function ShareLinkModal({
  targetId,
  targetNumber,
  linkType,
  onClose,
}: {
  targetId: string;
  targetNumber: string;
  linkType: string;
  onClose: () => void;
}) {
  const params = useParams();
  const companySlug = params.companySlug as string;

  const [canApprove, setCanApprove] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [isCreating, setIsCreating] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const res = await api.createCompanyDeliveryNoteSharedLink(companySlug, targetId, { canApprove, expiresInDays });
      setCreatedUrl(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '共有リンクの作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdUrl) return;
    try {
      await navigator.clipboard.writeText(createdUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            共有リンク — <span className="font-mono">{targetNumber}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {!createdUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={canApprove}
                    onChange={(e) => setCanApprove(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  承認・差戻し操作を許可
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">有効期間</label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value={7}>7日間</option>
                  <option value={14}>14日間</option>
                  <option value={30}>30日間</option>
                  <option value={60}>60日間</option>
                </select>
              </div>

              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full bg-primary text-white hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {isCreating ? '作成中...' : '共有リンクを発行'}
              </button>
            </div>
          )}

          {createdUrl && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">共有URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={createdUrl}
                  readOnly
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-700"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                >
                  {copied ? 'コピー済' : 'コピー'}
                </button>
              </div>
              <button
                onClick={() => setCreatedUrl(null)}
                className="text-sm text-primary hover:text-primary/80"
              >
                別のリンクを発行
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
