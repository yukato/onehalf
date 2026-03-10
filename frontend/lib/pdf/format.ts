export function formatCurrencyForPdf(amount: number): string {
  return `¥${new Intl.NumberFormat('ja-JP').format(amount)}`;
}

export function formatNumberForPdf(amount: number): string {
  return new Intl.NumberFormat('ja-JP').format(amount);
}

export function formatDateJP(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function formatDateReiwa(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const reiwaYear = year - 2018;
  return `令和${reiwaYear}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}
