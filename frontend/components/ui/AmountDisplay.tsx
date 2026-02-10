'use client';

interface AmountDisplayProps {
  amount: number;
  className?: string;
  showUnit?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AmountDisplay({ amount, className = '', showUnit = true, size = 'md' }: AmountDisplayProps) {
  const formatted = new Intl.NumberFormat('ja-JP').format(amount);

  const sizeClass = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
  }[size];

  return (
    <span className={`${sizeClass} ${className}`}>
      {showUnit ? `¥${formatted}` : formatted}
    </span>
  );
}

export function formatCurrency(amount: number): string {
  return `¥${new Intl.NumberFormat('ja-JP').format(amount)}`;
}

export function formatQuantity(qty: number, unit: string): string {
  return `${new Intl.NumberFormat('ja-JP').format(qty)} ${unit}`;
}
