'use client';

const statusColors: Record<string, { bg: string; text: string }> = {
  // Quotation statuses
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  sent: { bg: 'bg-blue-100', text: 'text-blue-700' },
  approved: { bg: 'bg-green-100', text: 'text-green-700' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700' },
  expired: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  // Order statuses
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-700' },
  in_production: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  ready: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  partially_delivered: { bg: 'bg-orange-100', text: 'text-orange-700' },
  delivered: { bg: 'bg-teal-100', text: 'text-teal-700' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500' },
  // Invoice statuses
  issued: { bg: 'bg-blue-100', text: 'text-blue-700' },
  partially_paid: { bg: 'bg-orange-100', text: 'text-orange-700' },
  paid: { bg: 'bg-green-100', text: 'text-green-700' },
  overdue: { bg: 'bg-red-100', text: 'text-red-700' },
  // Processing
  processing: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  error: { bg: 'bg-red-100', text: 'text-red-700' },
};

const statusLabels: Record<string, string> = {
  draft: '下書き',
  sent: '送付済',
  approved: '承認済',
  rejected: '差戻し',
  expired: '期限切れ',
  pending: '保留',
  confirmed: '確定',
  in_production: '製造中',
  ready: '出荷準備完了',
  partially_delivered: '一部納品',
  delivered: '納品済',
  completed: '完了',
  cancelled: 'キャンセル',
  issued: '発行済',
  partially_paid: '一部入金',
  paid: '入金済',
  overdue: '支払期限超過',
  processing: '処理中',
  error: 'エラー',
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
  const colors = statusColors[status] || statusColors.draft;
  const displayLabel = label || statusLabels[status] || status;

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colors.bg} ${colors.text} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {displayLabel}
    </span>
  );
}
