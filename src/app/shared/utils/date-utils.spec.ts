import { describe, expect, it } from 'vitest';
import {
  addDaysToIsoDate,
  daysBetweenIsoDates,
  getWeekId,
  parseIsoDate,
  toLocalIsoDate,
} from './date-utils';

describe('date-utils', () => {
  it('keeps late Sunday evening inside its own week (no UTC shift)', () => {
    // Sunday 8 Nov 2026, 22:00 local time: toISOString() would already say Monday in UTC-3.
    expect(getWeekId(new Date(2026, 10, 8, 22, 0))).toBe('2026-11-02');
  });

  it('formats and parses local calendar dates', () => {
    expect(toLocalIsoDate(new Date(2026, 10, 9, 23, 59))).toBe('2026-11-09');
    expect(parseIsoDate('2026-11-09')?.getDate()).toBe(9);
    expect(parseIsoDate('09/11/2026')).toBeNull();
    expect(parseIsoDate('')).toBeNull();
  });

  it('adds days across month and year boundaries', () => {
    expect(addDaysToIsoDate('2026-12-28', 7)).toBe('2027-01-04');
    expect(addDaysToIsoDate('2026-03-02', -7)).toBe('2026-02-23');
    expect(addDaysToIsoDate('nope', 7)).toBe('nope');
  });

  it('counts whole days between dates', () => {
    expect(daysBetweenIsoDates('2026-11-02', '2026-11-09')).toBe(7);
    expect(daysBetweenIsoDates('2026-11-09', '2026-11-02')).toBe(-7);
    expect(daysBetweenIsoDates('x', '2026-11-02')).toBeNull();
  });
});
