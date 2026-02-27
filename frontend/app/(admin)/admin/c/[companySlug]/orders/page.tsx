'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { ModuleHeader } from '@/components/modules/ModuleHeader';
import { SearchBox } from '@/components/ui/SearchBox';
import { OrderList } from '@/components/orders/OrderList';
const OrderDetail = dynamic(() => import('@/components/orders/OrderDetail').then(m => m.OrderDetail));
import { OrderShareModal } from '@/components/orders/OrderShareModal';
import { OcrUploadPanel } from '@/components/ocr/OcrUploadPanel';
import { OcrExtractionList } from '@/components/ocr/OcrExtractionList';
import { OcrReviewForm } from '@/components/ocr/OcrReviewForm';
import { ORDER_TYPE_LABELS } from '@/types';
import type { Order, OrderStatus, OrderType, OcrExtraction } from '@/types';

const PAGE_SIZE = 50;

type StatusFilter = 'all' | OrderStatus;
type MainTab = 'orders' | 'ocr';

type OrderTypeFilter = 'all' | OrderType;

const ORDER_TYPE_TABS: { key: OrderTypeFilter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'repair', label: ORDER_TYPE_LABELS.repair },
  { key: 'machine', label: ORDER_TYPE_LABELS.machine },
  { key: 'small_item', label: ORDER_TYPE_LABELS.small_item },
];

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'pending', label: '保留' },
  { key: 'confirmed', label: '確定' },
  { key: 'in_production', label: '製造中' },
  { key: 'ready', label: '出荷準備完了' },
  { key: 'delivered', label: '納品済' },
  { key: 'completed', label: '完了' },
];

export default function AdminOrdersPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;

  const [mainTab, setMainTab] = useState<MainTab>('orders');

  // Orders state
  const [orders, setOrders] = useState<Omit<Order, 'items'>[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [shareTarget, setShareTarget] = useState<{ id: string; number: string } | null>(null);

  // OCR state
  const [ocrExtractions, setOcrExtractions] = useState<OcrExtraction[]>([]);
  const [ocrTotal, setOcrTotal] = useState(0);
  const [ocrOffset, setOcrOffset] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedOcr, setSelectedOcr] = useState<OcrExtraction | null>(null);

  const loadOrders = useCallback(async (status?: StatusFilter, query?: string, newOffset?: number, orderType?: OrderTypeFilter) => {
    try {
      const res = await api.getCompanyOrders(companySlug, {
        status: status && status !== 'all' ? status : undefined,
        orderType: orderType && orderType !== 'all' ? orderType : undefined,
        q: query || undefined,
        limit: PAGE_SIZE,
        offset: newOffset ?? offset,
      });
      setOrders(res.orders);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  }, [companySlug, offset]);

  const loadOcrExtractions = useCallback(async (newOffset?: number) => {
    try {
      const res = await api.getCompanyOcrExtractions(companySlug, {
        limit: PAGE_SIZE,
        offset: newOffset ?? ocrOffset,
      });
      setOcrExtractions(res.extractions);
      setOcrTotal(res.total);
    } catch (err) {
      console.error('Failed to load OCR extractions:', err);
    }
  }, [companySlug, ocrOffset]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadOrders('all', '', 0);
      setIsLoading(false);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load OCR data when switching to OCR tab
  useEffect(() => {
    if (mainTab === 'ocr') {
      loadOcrExtractions(0);
    }
  }, [mainTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh extracting items
  useEffect(() => {
    if (mainTab !== 'ocr') return;
    const hasExtracting = ocrExtractions.some(e => e.status === 'pending' || e.status === 'extracting');
    if (!hasExtracting) return;

    const interval = setInterval(() => {
      loadOcrExtractions(ocrOffset);
    }, 3000);
    return () => clearInterval(interval);
  }, [mainTab, ocrExtractions, ocrOffset, loadOcrExtractions]);

  const handleSearch = () => {
    setOffset(0);
    loadOrders(statusFilter, searchQuery, 0, orderTypeFilter);
  };

  const handleStatusChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setOffset(0);
    setSearchQuery('');
    loadOrders(status, '', 0, orderTypeFilter);
  };

  const handleOrderTypeChange = (type: OrderTypeFilter) => {
    setOrderTypeFilter(type);
    setOffset(0);
    setSearchQuery('');
    loadOrders(statusFilter, '', 0, type);
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    loadOrders(statusFilter, searchQuery, newOffset, orderTypeFilter);
  };

  const handleEdit = async (order: Omit<Order, 'items'>) => {
    try {
      const full = await api.getCompanyOrder(companySlug, order.id);
      setDetailOrder(full);
    } catch (err) {
      console.error('Failed to load order detail:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この受注を削除しますか？')) return;
    try {
      await api.deleteCompanyOrder(companySlug, id);
      await loadOrders(statusFilter, searchQuery, offset, orderTypeFilter);
    } catch (err) {
      console.error('Failed to delete order:', err);
    }
  };

  const handleShare = (order: Omit<Order, 'items'>) => {
    setShareTarget({ id: order.id, number: order.orderNumber });
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.updateCompanyOrderStatus(companySlug, id, status);
      await loadOrders(statusFilter, searchQuery, offset, orderTypeFilter);
      if (detailOrder && detailOrder.id === id) {
        const updated = await api.getCompanyOrder(companySlug, id);
        setDetailOrder(updated);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // OCR handlers
  const handleOcrUpload = async (file: File, sourceType: string) => {
    setIsUploading(true);
    try {
      await api.uploadCompanyOcrImage(companySlug, file, sourceType);
      await loadOcrExtractions(0);
      setOcrOffset(0);
    } catch (err) {
      console.error('Failed to upload OCR image:', err);
      alert(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOcrSelect = async (extraction: OcrExtraction) => {
    try {
      const fresh = await api.getCompanyOcrExtraction(companySlug, extraction.id);
      setSelectedOcr(fresh);
    } catch (err) {
      console.error('Failed to load OCR detail:', err);
    }
  };

  const handleOcrSave = async (data: { extractedData: import('@/types').OcrExtractedData; matchedCustomerId?: string; matchedCustomerName?: string }) => {
    if (!selectedOcr) return;
    try {
      const updated = await api.updateCompanyOcrExtraction(companySlug, selectedOcr.id, {
        extractedData: data.extractedData,
        matchedCustomerId: data.matchedCustomerId,
        status: 'reviewed',
      });
      setSelectedOcr(updated);
      await loadOcrExtractions(ocrOffset);
    } catch (err) {
      console.error('Failed to save OCR extraction:', err);
      alert(err instanceof Error ? err.message : '保存に失敗しました');
    }
  };

  const handleOcrConvert = async () => {
    if (!selectedOcr) return;
    try {
      const result = await api.convertCompanyOcrToOrder(companySlug, selectedOcr.id);
      alert(`受注 ${result.orderNumber} を作成しました`);
      setSelectedOcr(null);
      await loadOcrExtractions(ocrOffset);
    } catch (err) {
      console.error('Failed to convert OCR to order:', err);
      alert(err instanceof Error ? err.message : '受注変換に失敗しました');
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
      <ModuleHeader moduleName="受注管理" icon="chart" />

      {/* Main Tabs: Orders / OCR */}
      <div className="flex gap-0 border-b border-gray-200 mb-4">
        <button
          onClick={() => setMainTab('orders')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            mainTab === 'orders'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          受注一覧
        </button>
        <button
          onClick={() => setMainTab('ocr')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            mainTab === 'ocr'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          OCR注文書取込
        </button>
      </div>

      {mainTab === 'orders' && (
        <>
          {/* Order Type Tabs */}
          <div className="flex gap-0 border-b border-gray-200 mb-2">
            {ORDER_TYPE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleOrderTypeChange(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  orderTypeFilter === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
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
            placeholder="受注番号・売上番号・取引先名で検索..."
            submitLabel="検索"
            className="mb-4"
          />

          {/* Order List */}
          <OrderList
            orders={orders}
            total={total}
            offset={offset}
            limit={PAGE_SIZE}
            onPageChange={handlePageChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onShare={handleShare}
            onStatusChange={handleStatusUpdate}
          />
        </>
      )}

      {mainTab === 'ocr' && (
        <div className="space-y-4">
          <OcrUploadPanel onUpload={handleOcrUpload} isUploading={isUploading} />
          <OcrExtractionList
            extractions={ocrExtractions}
            total={ocrTotal}
            offset={ocrOffset}
            limit={PAGE_SIZE}
            onPageChange={(newOffset) => {
              setOcrOffset(newOffset);
              loadOcrExtractions(newOffset);
            }}
            onSelect={handleOcrSelect}
          />
        </div>
      )}

      {/* Detail Modal */}
      {detailOrder && (
        <OrderDetail
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onShare={() => {
            setShareTarget({ id: detailOrder.id, number: detailOrder.orderNumber });
          }}
          onStatusChange={(status) => handleStatusUpdate(detailOrder.id, status)}
        />
      )}

      {/* Share Link Modal */}
      {shareTarget && (
        <OrderShareModal
          orderId={shareTarget.id}
          orderNumber={shareTarget.number}
          onClose={() => setShareTarget(null)}
        />
      )}

      {/* OCR Review Modal */}
      {selectedOcr && (
        <OcrReviewForm
          extraction={selectedOcr}
          onSave={handleOcrSave}
          onConvert={handleOcrConvert}
          onClose={() => setSelectedOcr(null)}
        />
      )}
    </div>
  );
}
