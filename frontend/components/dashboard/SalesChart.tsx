'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/components/ui/AmountDisplay';
import type { DailySales, MonthlySales } from '@/types';

interface SalesChartProps {
  daily: DailySales[];
  monthly: MonthlySales[];
  currentView: 'daily' | 'monthly';
  onViewChange: (v: 'daily' | 'monthly') => void;
}

function formatYAxis(value: number): string {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(value % 10000 === 0 ? 0 : 1)}万`;
  }
  return new Intl.NumberFormat('ja-JP').format(value);
}

function formatDailyLabel(date: string): string {
  const d = new Date(date);
  return `${d.getDate()}日`;
}

function formatMonthlyLabel(month: string): string {
  // month is expected as "YYYY-MM" or similar
  const parts = month.split('-');
  if (parts.length >= 2) {
    return `${parseInt(parts[1], 10)}月`;
  }
  return month;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { count?: number } }[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-slate-dark">
        {formatCurrency(payload[0].value)}
      </p>
      {payload[0].payload.count !== undefined && (
        <p className="text-xs text-gray-400">{payload[0].payload.count}件</p>
      )}
    </div>
  );
}

export function SalesChart({ daily, monthly, currentView, onViewChange }: SalesChartProps) {
  const isDaily = currentView === 'daily';

  const chartData = isDaily
    ? daily.map((d) => ({
        label: formatDailyLabel(d.date),
        sales: d.sales,
        count: d.count,
      }))
    : monthly.map((m) => ({
        label: formatMonthlyLabel(m.month),
        sales: m.sales,
        count: m.count,
      }));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-dark">売上推移</h3>
        <div className="flex overflow-hidden rounded-lg border border-gray-200">
          <button
            onClick={() => onViewChange('daily')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              isDaily
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            日次
          </button>
          <button
            onClick={() => onViewChange('monthly')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              !isDaily
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            月次
          </button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          データがありません
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(204, 120, 92, 0.08)' }} />
            <Bar dataKey="sales" fill="#CC785C" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
