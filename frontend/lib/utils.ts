/**
 * Generate a UUID v4 string.
 * Uses crypto.randomUUID() if available, otherwise falls back to a polyfill.
 */
export function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** アプリケーション標準タイムゾーン (JST) */
export const APP_TIMEZONE = 'Asia/Tokyo';

// --- 日付フォーマット共通ユーティリティ ---

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** APP_TIMEZONE でDate各パーツを取得するヘルパー */
function getDateParts(date: Date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map(p => [p.type, p.value])
  );
  return {
    y: parts.year,
    m: parts.month,
    d: parts.day,
    h: parts.hour === '24' ? '00' : parts.hour,
    min: parts.minute,
    sec: parts.second,
    weekday: WEEKDAYS[new Date(
      Date.UTC(+parts.year, +parts.month - 1, +parts.day)
    ).getUTCDay()],
  };
}

/**
 * 日時フォーマット: YYYY-MM-DD (曜) HH:mm
 * 管理画面のメイン日時表示用
 */
export function formatDateTime(dateStr: string): string {
  const { y, m, d, h, min, weekday } = getDateParts(new Date(dateStr));
  return `${y}-${m}-${d} (${weekday}) ${h}:${min}`;
}

/**
 * datetime-local input用フォーマット: YYYY-MM-DDTHH:mm
 */
export function toDateTimeLocal(dateStr: string): string {
  const { y, m, d, h, min } = getDateParts(new Date(dateStr));
  return `${y}-${m}-${d}T${h}:${min}`;
}

/**
 * 日付フォーマット（時刻なし）: YYYY/MM/DD
 * データソース一覧、ブラウズ系ページ用
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: APP_TIMEZONE,
    });
  } catch {
    return dateString || '-';
  }
}

/**
 * 日時フォーマット（日本語ロケール）: YYYY/MM/DD HH:mm
 * フィードバック、管理者ログイン履歴等
 */
export function formatDateTimeJa(dateString: string | null): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: APP_TIMEZONE,
    });
  } catch {
    return dateString || '-';
  }
}

/**
 * アクティビティログ用日時フォーマット: YYYY-MM-DD HH:mm:ss
 */
export function formatActivityLogDate(dateStr: string): string {
  const { y, m, d, h, min, sec } = getDateParts(new Date(dateStr));
  return `${y}-${m}-${d} ${h}:${min}:${sec}`;
}
