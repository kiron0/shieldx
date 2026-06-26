import { describe, expect, it, vi } from 'vitest';
import {
  formatDateOnly,
  formatDateStamp,
  formatDateTime,
  formatRelativeTime,
} from '../src/utils/date-format';

describe('date format utils', () => {
  it('formats full date/time consistently', () => {
    vi.useFakeTimers();
    const localNoon = new Date(2025, 0, 15, 12, 0, 0);
    vi.setSystemTime(localNoon);

    expect(formatDateTime(localNoon)).toBe('Jan 15, 2025 12:00 PM');
    expect(formatDateOnly(localNoon)).toBe('Jan 15, 2025');
    expect(formatDateStamp(localNoon)).toBe('2025-01-15');

    vi.useRealTimers();
  });

  it('formats relative dates consistently', () => {
    const now = new Date(2025, 0, 15, 12, 0, 0).getTime();
    expect(formatRelativeTime(new Date(2025, 0, 15, 11, 59, 30), now)).toBe(
      'Just now',
    );
    expect(formatRelativeTime(new Date(2025, 0, 15, 11, 0, 0), now)).toBe(
      '1 hr ago',
    );
  });
});
