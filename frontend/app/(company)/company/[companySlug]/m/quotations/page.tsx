'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { companyApi } from '@/lib/company-api';
import { SearchBox } from '@/components/ui/SearchBox';
import { QuotationList } from '@/components/quotations/QuotationList';
import { QuotationForm } from '@/components/quotations/QuotationForm';
import { QuotationDetail } from '@/components/quotations/QuotationDetail';
import { ShareLinkModal } from '@/components/quotations/ShareLinkModal';
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

export default function CompanyQuotationsPage() {
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
  const [detailQuotation, setDetailQuotation] = useState<Quotation | null>(null);
  const [shareTarget, setShareTarget] = useState<{ id: string; number: string } | null>(null);

  const loadQuotations = useCallback(async (status?: StatusFilter, query?: string, newOffset?: number) => {
    try {
      const res = await companyApi.getQuotations({
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
  }, [offset]);

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
      const full = await companyApi.getQuotation(quotation.id);
      setDetailQuotation(full);
    } catch (err) {
      console.error('Failed to load quotation detail:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この見積書を削除しますか？')) return;
    try {
      await companyApi.deleteQuotation(id);
      await loadQuotations(statusFilter, searchQuery, offset);
    } catch (err) {
      console.error('Failed to delete quotation:', err);
    }
  };

  const handleShare = (quotation: Omit<Quotation, 'items'>) => {
    setShareTarget({ id: quotation.id, number: quotation.quotationNumber });
  };

  const handleConvert = async (id: string) => {
    if (!confirm('この見積書を受注に変換しますか？')) return;
    try {
      await companyApi.convertQuotationToOrder(id);
      await loadQuotations(statusFilter, searchQuery, offset);
      setDetailQuotation(null);
    } catch (err) {
      console.error('Failed to convert quotation:', err);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await companyApi.updateQuotationStatus(id, status);
      await loadQuotations(statusFilter, searchQuery, offset);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleFormSaved = () => {
    setShowForm(false);
    loadQuotations(statusFilter, searchQuery, 0);
    setOffset(0);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">見積管理</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規作成
        </button>
      </div>

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

      {/* Detail Modal */}
      {detailQuotation && (
        <QuotationDetail
          quotation={detailQuotation}
          onClose={() => setDetailQuotation(null)}
          onShare={() => {
            setShareTarget({ id: detailQuotation.id, number: detailQuotation.quotationNumber });
          }}
          onConvert={() => handleConvert(detailQuotation.id)}
          onPdf={() => {
            window.open(companyApi.getQuotationPdfUrl(detailQuotation.id), '_blank');
          }}
        />
      )}

      {/* Share Link Modal */}
      {shareTarget && (
        <ShareLinkModal
          quotationId={shareTarget.id}
          quotationNumber={shareTarget.number}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}
