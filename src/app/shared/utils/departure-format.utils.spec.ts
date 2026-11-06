import { describe, expect, it } from 'vitest';
import { formatDepartureDay, formatDepartureTitle, getWeekdayName } from './departure-format.utils';

describe('departure-format.utils', () => {
  it('names the day with its number', () => {
    expect(formatDepartureDay('2026-11-10')).toBe('Martes 10 nov');
    expect(getWeekdayName('2026-11-08')).toBe('Domingo');
  });

  it('builds the card title with date and time', () => {
    expect(formatDepartureTitle('2026-11-10', '18:30')).toBe('Martes 10 nov · 18:30');
    expect(formatDepartureTitle('2026-11-10', '')).toBe('Martes 10 nov · Sin horario');
    expect(formatDepartureTitle('', '18:30')).toBe('Nueva salida');
  });
});
