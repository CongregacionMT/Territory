import { Departure } from '@core/models/Departures';

const MINUTES_PER_HOUR = 60;

/**
 * Converts a schedule string ("HH:mm", "H:mm", "HH:mmhs") into minutes since midnight.
 * Returns null when the schedule is empty or cannot be parsed.
 */
export function scheduleToMinutes(schedule: string | undefined | null): number | null {
  const match = /^\s*(\d{1,2}):(\d{2})/.exec(schedule ?? '');
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * MINUTES_PER_HOUR + minutes;
}

/**
 * Chronological comparator for departures: by date (YYYY-MM-DD), then by schedule.
 * Departures without a valid schedule are placed last within their day.
 */
export function compareDeparturesByDateTime(a: Departure, b: Departure): number {
  const dateComparison = (a.date ?? '').localeCompare(b.date ?? '');
  if (dateComparison !== 0) return dateComparison;

  const minutesA = scheduleToMinutes(a.schedule);
  const minutesB = scheduleToMinutes(b.schedule);

  if (minutesA === null && minutesB === null) return 0;
  if (minutesA === null) return 1;
  if (minutesB === null) return -1;
  return minutesA - minutesB;
}

/**
 * Returns a new array sorted chronologically, without mutating the input.
 */
export function sortDeparturesByDateTime(departures: readonly Departure[]): Departure[] {
  return [...departures].sort(compareDeparturesByDateTime);
}
