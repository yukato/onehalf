import {
  generateUUID,
  formatDateTime,
  toDateTimeLocal,
  formatDate,
  formatDateTimeJa,
  formatActivityLogDate,
} from '@/lib/utils';

describe('generateUUID', () => {
  it('returns a string', () => {
    const uuid = generateUUID();
    expect(typeof uuid).toBe('string');
  });

  it('returns a valid UUID v4 format', () => {
    const uuid = generateUUID();
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidV4Regex);
  });

  it('generates unique values', () => {
    const uuids = new Set(Array.from({ length: 100 }, () => generateUUID()));
    expect(uuids.size).toBe(100);
  });
});

describe('formatDateTime', () => {
  it('formats ISO string to YYYY-MM-DD (曜) HH:mm in JST', () => {
    // 2026-01-15T05:30:00Z → JST 14:30
    expect(formatDateTime('2026-01-15T05:30:00Z')).toBe('2026-01-15 (木) 14:30');
  });

  it('displays correct weekday for Sunday', () => {
    // 2026-01-18 is Sunday in JST
    expect(formatDateTime('2026-01-18T00:00:00+09:00')).toBe('2026-01-18 (日) 00:00');
  });

  it('displays correct weekday for Saturday', () => {
    // 2026-01-17 is Saturday in JST
    expect(formatDateTime('2026-01-17T12:00:00+09:00')).toBe('2026-01-17 (土) 12:00');
  });

  it('handles month start boundary', () => {
    expect(formatDateTime('2026-03-01T00:00:00+09:00')).toBe('2026-03-01 (日) 00:00');
  });

  it('handles month end boundary', () => {
    expect(formatDateTime('2026-01-31T23:59:00+09:00')).toBe('2026-01-31 (土) 23:59');
  });

  it('handles year boundary (New Year)', () => {
    // 2025-12-31T15:00:00Z → 2026-01-01 00:00 JST
    expect(formatDateTime('2025-12-31T15:00:00Z')).toBe('2026-01-01 (木) 00:00');
  });

  it('zero-pads single-digit month and day', () => {
    expect(formatDateTime('2026-02-03T01:05:00+09:00')).toBe('2026-02-03 (火) 01:05');
  });
});

describe('toDateTimeLocal', () => {
  it('formats ISO string to YYYY-MM-DDTHH:mm in JST', () => {
    expect(toDateTimeLocal('2026-01-15T05:30:00Z')).toBe('2026-01-15T14:30');
  });

  it('produces datetime-local compatible format', () => {
    const result = toDateTimeLocal('2026-06-20T10:00:00Z');
    // datetime-local format: YYYY-MM-DDTHH:mm
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('handles midnight UTC → JST conversion', () => {
    // 2026-01-15T00:00:00Z → JST 09:00
    expect(toDateTimeLocal('2026-01-15T00:00:00Z')).toBe('2026-01-15T09:00');
  });

  it('handles date rollover from UTC to JST', () => {
    // 2026-01-14T20:00:00Z → JST 2026-01-15T05:00
    expect(toDateTimeLocal('2026-01-14T20:00:00Z')).toBe('2026-01-15T05:00');
  });
});

describe('formatDate', () => {
  it('formats ISO string to YYYY/MM/DD in JST', () => {
    expect(formatDate('2026-01-15T05:30:00Z')).toBe('2026/01/15');
  });

  it('returns "-" for null input', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('returns "-" for empty string', () => {
    expect(formatDate('')).toBe('-');
  });

  it('handles date-only string', () => {
    const result = formatDate('2026-07-04');
    expect(result).toBe('2026/07/04');
  });
});

describe('formatDateTimeJa', () => {
  it('formats ISO string to YYYY/MM/DD HH:mm in JST', () => {
    expect(formatDateTimeJa('2026-01-15T05:30:00Z')).toBe('2026/01/15 14:30');
  });

  it('returns "-" for null input', () => {
    expect(formatDateTimeJa(null)).toBe('-');
  });

  it('returns "-" for empty string', () => {
    expect(formatDateTimeJa('')).toBe('-');
  });

  it('handles midnight JST', () => {
    // 2026-01-14T15:00:00Z → JST 2026-01-15 00:00
    expect(formatDateTimeJa('2026-01-14T15:00:00Z')).toBe('2026/01/15 00:00');
  });
});

describe('formatActivityLogDate', () => {
  it('formats ISO string to YYYY-MM-DD HH:mm:ss in JST', () => {
    expect(formatActivityLogDate('2026-01-15T05:30:45Z')).toBe('2026-01-15 14:30:45');
  });

  it('zero-pads seconds', () => {
    expect(formatActivityLogDate('2026-01-15T05:30:03Z')).toBe('2026-01-15 14:30:03');
  });

  it('zero-pads hours and minutes', () => {
    expect(formatActivityLogDate('2026-01-14T16:05:07Z')).toBe('2026-01-15 01:05:07');
  });

  it('handles second boundary (59 seconds)', () => {
    expect(formatActivityLogDate('2026-01-15T05:30:59Z')).toBe('2026-01-15 14:30:59');
  });

  it('handles midnight exactly', () => {
    // 2026-01-14T15:00:00Z → JST 2026-01-15 00:00:00
    expect(formatActivityLogDate('2026-01-14T15:00:00Z')).toBe('2026-01-15 00:00:00');
  });
});
