'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { companyApi } from '@/lib/company-api';
import { SearchBox } from '@/components/ui/SearchBox';
import { OrderList } from '@/components/orders/OrderList';
import { OrderDetail } from '@/components/orders/OrderDetail';
import { OrderShareModal } from '@/components/orders/OrderShareModal';
import { ORDER_TYPE_LABELS } from '@/types';
import type { Order, OrderStatus, OrderType } from '@/types';

const PAGE_SIZE = 50;

type StatusFilter = 'all' | OrderStatus;
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

export default function CompanyOrdersPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;

  const [orders, setOrders] = useState<Omit<Order, 'items'>[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [shareTarget, setShareTarget] = useState<{ id: string; number: string } | null>(null);

  const loadOrders = useCallback(async (status?: StatusFilter, query?: string, newOffset?: number, orderType?: OrderTypeFilter) => {
    try {
      const res = await companyApi.getOrders({
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
  }, [offset]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadOrders('all', '', 0);
      setIsLoading(false);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      const full = await companyApi.getOrder(order.id);
      setDetailOrder(full);
    } catch (err) {
      console.error('Failed to load order detail:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この受注を削除しますか？')) return;
    try {
      await companyApi.deleteOrder(id);
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
      await companyApi.updateOrderStatus(id, status);
      await loadOrders(statusFilter, searchQuery, offset, orderTypeFilter);
      // Also refresh the detail if it's open
      if (detailOrder && detailOrder.id === id) {
        const updated = await companyApi.getOrder(id);
        setDetailOrder(updated);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">受注管理</h1>
      </div>

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
    </div>
  );
}
