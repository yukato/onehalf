'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { ModuleHeader } from '@/components/modules/ModuleHeader';
import { SearchBox } from '@/components/ui/SearchBox';
import { QuotationList } from '@/components/quotations/QuotationList';
const QuotationForm = dynamic(() => import('@/components/quotations/QuotationForm').then(m => m.QuotationForm));
const QuotationDetail = dynamic(() => import('@/components/quotations/QuotationDetail').then(m => m.QuotationDetail));
import { ShareLinkModal } from '@/components/quotations/ShareLinkModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { openQuotationPdf } from '@/lib/pdf/generate-quotation-pdf';
import type { Quotation, QuotationStatus } from '@/types';

const PAGE_SIZE = 50;

type StatusFilter = 'all' | QuotationStatus;

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全て' },
  { key: 'draft', label: '下書き' },
  { key: 'sent', label: '送付済' },
  { key: 'approved', label: '承認済' },
  { key: 'rejected', label: '差戻し' },
];

export default function AdminQuotationsPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;

  const [quotations, setQuotations] = useState<Omit<Quotation, 'items'>[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [detailQuotation, setDetailQuotation] = useState<Quotation | null>(null);
  const [shareTarget, setShareTarget] = useState<{ id: string; number: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; variant?: 'primary' | 'danger'; onConfirm: () => void } | null>(null);

  const loadQuotations = useCallback(async (status?: StatusFilter, query?: string, newOffset?: number) => {
    try {
      const res = await api.getCompanyQuotations(companySlug, {
        status: status && status !== 'all' ? status : undefined,
        q: query || undefined,
        limit: PAGE_SIZE,
        offset: newOffset ?? offset,
      });
      setQuotations(res.quotations);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load quotations:', err);
    }
  }, [companySlug, offset]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadQuotations('all', '', 0);
      setIsLoading(false);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    setOffset(0);
    loadQuotations(statusFilter, searchQuery, 0);
  };

  const handleStatusChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setOffset(0);
    setSearchQuery('');
    loadQuotations(status, '', 0);
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    loadQuotations(statusFilter, searchQuery, newOffset);
  };

  const handleEdit = async (quotation: Omit<Quotation, 'items'>) => {
    try {
      const full = await api.getCompanyQuotation(companySlug, quotation.id);
      setDetailQuotation(full);
    } catch (err) {
      console.error('Failed to load quotation detail:', err);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmAction({
      title: '見積書の削除',
      message: 'この見積書を削除しますか？\nこの操作は取り消せません。',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await api.deleteCompanyQuotation(companySlug, id);
          await loadQuotations(statusFilter, searchQuery, offset);
        } catch (err) {
          console.error('Failed to delete quotation:', err);
        }
      },
    });
  };

  const handleShare = (quotation: Omit<Quotation, 'items'>) => {
    setShareTarget({ id: quotation.id, number: quotation.quotationNumber });
  };

  const handleConvert = (id: string) => {
    setConfirmAction({
      title: '受注に変換',
      message: 'この見積書を受注に変換しますか？\n見積書のステータスは変更されません。',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await api.convertCompanyQuotation(companySlug, id);
          await loadQuotations(statusFilter, searchQuery, offset);
          setDetailQuotation(null);
        } catch (err) {
          console.error('Failed to convert quotation:', err);
        }
      },
    });
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.updateCompanyQuotationStatus(companySlug, id, status);
      await loadQuotations(statusFilter, searchQuery, offset);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleFormSaved = () => {
    setShowForm(false);
    setEditingQuotation(null);
    loadQuotations(statusFilter, searchQuery, 0);
    setOffset(0);
  };

  const handleEditFromDetail = () => {
    if (detailQuotation) {
      setEditingQuotation(detailQuotation);
      setDetailQuotation(null);
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
      <ModuleHeader
        moduleName="見積管理"
        icon="receipt"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新規作成
          </button>
        }
      />

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
        placeholder="見積番号・取引先名・件名で検索..."
        submitLabel="検索"
        className="mb-4"
      />

      {/* Quotation List */}
      <QuotationList
        quotations={quotations}
        total={total}
        offset={offset}
        limit={PAGE_SIZE}
        onPageChange={handlePageChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onShare={handleShare}
        onConvert={handleConvert}
        onStatusChange={handleStatusUpdate}
      />

      {/* Create Form Modal */}
      {showForm && (
        <QuotationForm
          onSave={handleFormSaved}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Edit Form Modal */}
      {editingQuotation && (
        <QuotationForm
          initialData={editingQuotation}
          onSave={handleFormSaved}
          onClose={() => setEditingQuotation(null)}
        />
      )}

      {/* Detail Modal */}
      {detailQuotation && (
        <QuotationDetail
          quotation={detailQuotation}
          onClose={() => setDetailQuotation(null)}
          onEdit={handleEditFromDetail}
          onShare={() => {
            setShareTarget({ id: detailQuotation.id, number: detailQuotation.quotationNumber });
          }}
          onConvert={() => handleConvert(detailQuotation.id)}
          onPdf={async () => {
            if (process.env.NEXT_PUBLIC_AUTH_MOCK === 'true') {
              await openQuotationPdf(detailQuotation);
            } else {
              window.open(api.getCompanyQuotationPdfUrl(companySlug, detailQuotation.id), '_blank');
            }
            if (detailQuotation.status === 'draft') {
              await handleStatusUpdate(detailQuotation.id, 'sent');
              const updated = await api.getCompanyQuotation(companySlug, detailQuotation.id);
              setDetailQuotation(updated);
            }
          }}
          onStatusChange={async (id, status) => {
            await handleStatusUpdate(id, status);
            const updated = await api.getCompanyQuotation(companySlug, id);
            setDetailQuotation(updated);
          }}
        />
      )}

      {/* Share Link Modal */}
      {shareTarget && (
        <ShareLinkModal
          quotationId={shareTarget.id}
          quotationNumber={shareTarget.number}
          onClose={() => setShareTarget(null)}
          onLinkCreated={async () => {
            await handleStatusUpdate(shareTarget.id, 'sent');
            await loadQuotations(statusFilter, searchQuery, offset);
            if (detailQuotation && detailQuotation.id === shareTarget.id) {
              const updated = await api.getCompanyQuotation(companySlug, shareTarget.id);
              setDetailQuotation(updated);
            }
          }}
        />
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          variant={confirmAction.variant}
          confirmLabel="実行"
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
