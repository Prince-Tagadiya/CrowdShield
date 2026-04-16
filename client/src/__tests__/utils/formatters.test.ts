import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeTime, formatWaitTime, formatNumber } from '../../utils/formatters';

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for timestamps less than 1 minute ago', () => {
    const now = Date.now();
    expect(formatRelativeTime(now)).toBe('Just now');
    expect(formatRelativeTime(now - 30000)).toBe('Just now'); // 30 seconds
  });

  it('returns minutes for timestamps less than 1 hour ago', () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 60000)).toBe('1 min ago');
    expect(formatRelativeTime(now - 300000)).toBe('5 min ago');
    expect(formatRelativeTime(now - 3540000)).toBe('59 min ago');
  });

  it('returns hours for timestamps less than 24 hours ago', () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 3600000)).toBe('1 hr ago');
    expect(formatRelativeTime(now - 7200000)).toBe('2 hr ago');
  });

  it('returns a date string for timestamps more than 24 hours ago', () => {
    const now = Date.now();
    const result = formatRelativeTime(now - 86400000); // 24 hours
    // Should be a date string, not relative time
    expect(result).not.toContain('ago');
    expect(result).not.toBe('Just now');
  });
});

describe('formatWaitTime', () => {
  it('returns "No wait" for 0 minutes', () => {
    expect(formatWaitTime(0)).toBe('No wait');
  });

  it('returns "No wait" for negative minutes', () => {
    expect(formatWaitTime(-5)).toBe('No wait');
  });

  it('returns minutes for values under 60', () => {
    expect(formatWaitTime(1)).toBe('1 min');
    expect(formatWaitTime(15)).toBe('15 min');
    expect(formatWaitTime(59)).toBe('59 min');
  });

  it('returns hours and minutes for values >= 60', () => {
    expect(formatWaitTime(60)).toBe('1h');
    expect(formatWaitTime(90)).toBe('1h 30m');
    expect(formatWaitTime(120)).toBe('2h');
    expect(formatWaitTime(150)).toBe('2h 30m');
  });
});

describe('formatNumber', () => {
  it('formats small numbers without commas', () => {
    expect(formatNumber(100)).toBe('100');
  });

  it('formats large numbers with commas', () => {
    // toLocaleString output varies by locale, so check structure
    const result = formatNumber(33000);
    expect(result).toContain('33');
    expect(result.length).toBeGreaterThan(4); // should have separator
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});
