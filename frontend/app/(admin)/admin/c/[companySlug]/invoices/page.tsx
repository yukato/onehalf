'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ModuleHeader } from '@/components/modules/ModuleHeader';
import { SearchBox } from '@/components/ui/SearchBox';
import { InvoiceList } from '@/components/invoices/InvoiceList';
import { InvoiceDetail } from '@/components/invoices/InvoiceDetail';
import { PaymentForm } from '@/components/invoices/PaymentForm';
import type { Invoice, InvoiceStatus, Customer, DeliveryNote } from '@/types';

const PAGE_SIZE = 50;

type StatusFilter = 'all' | InvoiceStatus;

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'draft', label: '下書き' },
  { key: 'issued', label: '発行済' },
  { key: 'sent', label: '送付済' },
  { key: 'partially_paid', label: '一部入金' },
  { key: 'paid', label: '入金済' },
  { key: 'overdue', label: '期限超過' },
];

export default function AdminInvoicesPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;

  const [invoices, setInvoices] = useState<Omit<Invoice, 'items' | 'payments'>[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [shareTarget, setShareTarget] = useState<{ id: string; number: string } | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<{ id: string; number: string; remaining: number } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadInvoices = useCallback(async (status?: StatusFilter, query?: string, newOffset?: number) => {
    try {
      const res = await api.getCompanyInvoices(companySlug, {
        status: status && status !== 'all' ? status : undefined,
        q: query || undefined,
        limit: PAGE_SIZE,
        offset: newOffset ?? offset,
      });
      setInvoices(res.invoices);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    }
  }, [companySlug, offset]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadInvoices('all', '', 0);
      setIsLoading(false);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    setOffset(0);
    loadInvoices(statusFilter, searchQuery, 0);
  };

  const handleStatusChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setOffset(0);
    setSearchQuery('');
    loadInvoices(status, '', 0);
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    loadInvoices(statusFilter, searchQuery, newOffset);
  };

  const handleEdit = async (invoice: Omit<Invoice, 'items' | 'payments'>) => {
    try {
      const full = await api.getCompanyInvoice(companySlug, invoice.id);
      setDetailInvoice(full);
    } catch (err) {
      console.error('Failed to load invoice detail:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この請求書を削除しますか？')) return;
    try {
      await api.deleteCompanyInvoice(companySlug, id);
      await loadInvoices(statusFilter, searchQuery, offset);
    } catch (err) {
      console.error('Failed to delete invoice:', err);
    }
  };

  const handleShare = (invoice: Omit<Invoice, 'items' | 'payments'>) => {
    setShareTarget({ id: invoice.id, number: invoice.invoiceNumber });
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.updateCompanyInvoiceStatus(companySlug, id, status);
      await loadInvoices(statusFilter, searchQuery, offset);
      if (detailInvoice && detailInvoice.id === id) {
        const updated = await api.getCompanyInvoice(companySlug, id);
        setDetailInvoice(updated);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleAddPayment = (invoice: Omit<Invoice, 'items' | 'payments'>) => {
    const remaining = invoice.totalAmount - invoice.paidAmount;
    setPaymentTarget({ id: invoice.id, number: invoice.invoiceNumber, remaining });
  };

  const handleAddPaymentFromDetail = () => {
    if (!detailInvoice) return;
    const remaining = detailInvoice.totalAmount - detailInvoice.paidAmount;
    setPaymentTarget({ id: detailInvoice.id, number: detailInvoice.invoiceNumber, remaining });
  };

  const handlePaymentSaved = async () => {
    setPaymentTarget(null);
    await loadInvoices(statusFilter, searchQuery, offset);
    if (detailInvoice) {
      try {
        const updated = await api.getCompanyInvoice(companySlug, detailInvoice.id);
        setDetailInvoice(updated);
      } catch { /* ignore */ }
    }
  };

  const handleCreateSaved = () => {
    setShowCreateForm(false);
    loadInvoices(statusFilter, searchQuery, 0);
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
      <ModuleHeader
        moduleName="請求管理"
        icon="money"
        actions={
          <button
            onClick={() => setShowCreateForm(true)}
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
        placeholder="請求番号・取引先名で検索..."
        submitLabel="検索"
        className="mb-4"
      />

      {/* Invoice List */}
      <InvoiceList
        invoices={invoices}
        total={total}
        offset={offset}
        limit={PAGE_SIZE}
        onPageChange={handlePageChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onShare={handleShare}
        onStatusChange={handleStatusUpdate}
        onAddPayment={handleAddPayment}
      />

      {/* Create Form Modal */}
      {showCreateForm && (
        <InvoiceCreateForm
          companySlug={companySlug}
          onSaved={handleCreateSaved}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {/* Detail Modal */}
      {detailInvoice && (
        <InvoiceDetail
          invoice={detailInvoice}
          onClose={() => setDetailInvoice(null)}
          onShare={() => {
            setShareTarget({ id: detailInvoice.id, number: detailInvoice.invoiceNumber });
          }}
          onStatusChange={(status) => handleStatusUpdate(detailInvoice.id, status)}
          onAddPayment={handleAddPaymentFromDetail}
        />
      )}

      {/* Payment Form Modal */}
      {paymentTarget && (
        <PaymentForm
          invoiceId={paymentTarget.id}
          invoiceNumber={paymentTarget.number}
          remainingAmount={paymentTarget.remaining}
          onSaved={handlePaymentSaved}
          onClose={() => setPaymentTarget(null)}
        />
      )}

      {/* Share Link Modal */}
      {shareTarget && (
        <InvoiceShareModal
          companySlug={companySlug}
          invoiceId={shareTarget.id}
          invoiceNumber={shareTarget.number}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Invoice Create Form ────────────────────────────────────────

function InvoiceCreateForm({
  companySlug,
  onSaved,
  onClose,
}: {
  companySlug: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState<Omit<DeliveryNote, 'items'>[]>([]);
  const [selectedDnIds, setSelectedDnIds] = useState<string[]>([]);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getCompanyCustomers(companySlug, { limit: 500 });
        setCustomers(res.customers);
      } catch { /* ignore */ }
    };
    load();
  }, [companySlug]);

  useEffect(() => {
    if (!customerId) {
      setDeliveryNotes([]);
      setSelectedDnIds([]);
      return;
    }
    const load = async () => {
      try {
        const res = await api.getCompanyDeliveryNotes(companySlug, { customerId, status: 'confirmed', limit: 200 });
        setDeliveryNotes(res.deliveryNotes);
        setSelectedDnIds([]);
      } catch { /* ignore */ }
    };
    load();
  }, [companySlug, customerId]);

  const toggleDn = (id: string) => {
    setSelectedDnIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('取引先を選択してください');
      return;
    }
    if (selectedDnIds.length === 0) {
      setError('請求に含める納品書を選択してください');
      return;
    }
    if (!dueDate) {
      setError('支払期限を入力してください');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await api.createCompanyInvoice(companySlug, {
        customerId,
        deliveryNoteIds: selectedDnIds,
        invoiceDate,
        dueDate,
        notes: notes || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '請求書の作成に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">請求書を作成</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">取引先 *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">選択してください</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>

          {customerId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                納品書を選択 * <span className="text-gray-400 font-normal">(確認済の納品書)</span>
              </label>
              {deliveryNotes.length === 0 ? (
                <p className="text-sm text-gray-400 bg-gray-50 p-3 rounded-lg">確認済の納品書がありません</p>
              ) : (
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {deliveryNotes.map((dn) => (
                    <label
                      key={dn.id}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDnIds.includes(dn.id)}
                        onChange={() => toggleDn(dn.id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <div className="flex-1 text-sm">
                        <span className="font-mono text-gray-500">{dn.deliveryNumber}</span>
                        <span className="mx-2 text-gray-300">|</span>
                        <span className="text-gray-700">{dn.deliveryDate}</span>
                        <span className="mx-2 text-gray-300">|</span>
                        <span className="font-medium text-gray-900">
                          {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(dn.totalAmount)}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">請求日 *</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">支払期限 *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-primary text-white hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {isSaving ? '作成中...' : '請求書を作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Invoice Share Modal ────────────────────────────────────────

function InvoiceShareModal({
  companySlug,
  invoiceId,
  invoiceNumber,
  onClose,
}: {
  companySlug: string;
  invoiceId: string;
  invoiceNumber: string;
  onClose: () => void;
}) {
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
      const res = await api.createCompanyInvoiceSharedLink(companySlug, invoiceId, { canApprove, expiresInDays });
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
            共有リンク — <span className="font-mono">{invoiceNumber}</span>
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
