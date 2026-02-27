'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { api } from '@/lib/api';
import { ModuleHeader } from '@/components/modules/ModuleHeader';
import dynamic from 'next/dynamic';
import { KpiCards } from '@/components/dashboard/KpiCards';
const SalesChart = dynamic(() => import('@/components/dashboard/SalesChart').then(m => m.SalesChart), {
  ssr: false,
  loading: () => <div className="bg-white rounded-lg border border-gray-200 p-6"><div className="h-64 bg-gray-100 rounded animate-pulse" /></div>,
});
import { RankingTables } from '@/components/dashboard/RankingTables';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
const AiInsights = dynamic(() => import('@/components/dashboard/AiInsights').then(m => m.AiInsights), {
  loading: () => <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"><div className="h-4 bg-gray-200 rounded w-32 mb-4" /><div className="h-32 bg-gray-100 rounded" /></div>,
});
const SuggestionsPanel = dynamic(() => import('@/components/ai/SuggestionsPanel').then(m => m.SuggestionsPanel), {
  loading: () => <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"><div className="h-4 bg-gray-200 rounded w-40 mb-4" /><div className="h-24 bg-gray-100 rounded" /></div>,
});
import type {
  DashboardSummary,
  DailySales,
  MonthlySales,
  TopCustomer,
  TopProduct,
  Receivable,
  RecentOrder,
  OrderStatusCount,
} from '@/types';

const MONTH_NAMES = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
];

export default function AdminCompanyDashboardPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;

  const fetchAiAnalysis = useMemo(
    () => (refresh?: boolean) => api.getCompanyDashboardAiAnalysis(companySlug, refresh),
    [companySlug]
  );

  const fetchSuggestions = useMemo(
    () => () => api.getCompanySuggestions(companySlug),
    [companySlug]
  );

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [chartView, setChartView] = useState<'daily' | 'monthly'>('daily');

  // Data states
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<OrderStatusCount[]>([]);
  const [daily, setDaily] = useState<DailySales[]>([]);
  const [monthly, setMonthly] = useState<MonthlySales[]>([]);
  const [customers, setCustomers] = useState<TopCustomer[]>([]);
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load summary, rankings, receivables (only on mount)
  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        setLoading(true);
        setError(null);

        const [summaryRes, rankingsRes, receivablesRes] = await Promise.all([
          api.getCompanyDashboardSummary(companySlug),
          api.getCompanyDashboardRankings(companySlug),
          api.getCompanyDashboardReceivables(companySlug),
        ]);

        if (cancelled) return;

        setSummary(summaryRes.summary);
        setRecentOrders(summaryRes.recentOrders);
        setStatusDistribution(summaryRes.statusDistribution);
        setCustomers(rankingsRes.customers);
        setProducts(rankingsRes.products);
        setReceivables(receivablesRes.receivables);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitialData();
    return () => { cancelled = true; };
  }, [companySlug]);

  // Load sales data (on mount and when year/month changes)
  const loadSalesData = useCallback(async () => {
    try {
      const salesRes = await api.getCompanyDashboardSales(companySlug, year, month);
      setDaily(salesRes.daily);
      setMonthly(salesRes.monthly);
    } catch (err) {
      console.error('売上データの取得に失敗しました:', err);
    }
  }, [companySlug, year, month]);

  useEffect(() => {
    loadSalesData();
  }, [loadSalesData]);

  // Month navigation
  const goToPreviousMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ModuleHeader moduleName="ダッシュボード" icon="chart" />
        <div className="space-y-6">
          {/* KPI skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-32" />
              </div>
            ))}
          </div>
          {/* Chart skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
            <div className="h-64 bg-gray-100 rounded" />
          </div>
          {/* Rankings skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
                <div className="space-y-3">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="h-4 bg-gray-100 rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ModuleHeader moduleName="ダッシュボード" icon="chart" />
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium mb-2">エラーが発生しました</p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ModuleHeader moduleName="ダッシュボード" icon="chart" />

      {/* KPI Cards */}
      {summary && <KpiCards summary={summary} />}

      {/* Action Suggestions */}
      <div className="mt-6">
        <SuggestionsPanel
          fetchSuggestions={fetchSuggestions}
          companySlug={companySlug}
          basePath={`/admin/c/${companySlug}`}
        />
      </div>

      {/* Sales Chart with month navigation */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label="前月"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">
              {year}年{MONTH_NAMES[month - 1]}
            </span>
            <button
              onClick={goToNextMonth}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label="翌月"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <SalesChart
          daily={daily}
          monthly={monthly}
          currentView={chartView}
          onViewChange={setChartView}
        />
      </div>

      {/* Ranking Tables */}
      <div className="mt-6">
        <RankingTables customers={customers} products={products} />
      </div>

      {/* Recent Activity */}
      <div className="mt-6">
        <RecentActivity orders={recentOrders} receivables={receivables} />
      </div>

      {/* AI Insights */}
      <div className="mt-6">
        <AiInsights companySlug={companySlug} isAdmin fetchFn={fetchAiAnalysis} />
      </div>
    </div>
  );
}
