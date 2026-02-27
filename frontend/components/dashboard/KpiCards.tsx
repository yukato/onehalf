'use client';

import React from 'react';
import { formatCurrency } from '@/components/ui/AmountDisplay';
import type { DashboardSummary } from '@/types';

interface KpiCardsProps {
  summary: DashboardSummary;
}

function CalendarIcon() {
  return (
    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
  );
}

export const KpiCards = React.memo(function KpiCards({ summary }: KpiCardsProps) {
  const hasReceivable = summary.receivableAmount > 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 今月の売上 */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="mb-3">
          <CalendarIcon />
        </div>
        <p className="text-sm text-gray-500">今月の売上</p>
        <p className="mt-1 text-2xl font-bold text-slate-dark">
          {formatCurrency(summary.monthlySales)}
        </p>
        <p className="mt-1 text-sm text-gray-400">{summary.monthlyOrderCount}件</p>
      </div>

      {/* 総売上 */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="mb-3">
          <CurrencyIcon />
        </div>
        <p className="text-sm text-gray-500">総売上</p>
        <p className="mt-1 text-2xl font-bold text-slate-dark">
          {formatCurrency(summary.totalSales)}
        </p>
        <p className="mt-1 text-sm text-gray-400">{summary.orderCount}件</p>
      </div>

      {/* 平均受注額 */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="mb-3">
          <ChartIcon />
        </div>
        <p className="text-sm text-gray-500">平均受注額</p>
        <p className="mt-1 text-2xl font-bold text-slate-dark">
          {formatCurrency(summary.avgOrderAmount)}
        </p>
      </div>

      {/* 未回収残高 */}
      <div className={`rounded-lg border bg-white p-5 ${hasReceivable ? 'border-orange-200' : 'border-gray-200'}`}>
        <div className="mb-3">
          {hasReceivable ? <WarningIcon /> : <CurrencyIcon />}
        </div>
        <p className="text-sm text-gray-500">未回収残高</p>
        <p className={`mt-1 text-2xl font-bold ${hasReceivable ? 'text-red-600' : 'text-slate-dark'}`}>
          {formatCurrency(summary.receivableAmount)}
        </p>
        <p className={`mt-1 text-sm ${hasReceivable ? 'text-orange-500' : 'text-gray-400'}`}>
          {summary.receivableCount}件
        </p>
      </div>
    </div>
  );
});
