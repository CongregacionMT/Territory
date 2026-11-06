import { parseIsoDate } from './date-utils';

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];
/** "Martes" for 2026-11-10. Empty string when the date is invalid. */
export function getWeekdayName(dateStr: string): string {
  const date = parseIsoDate(dateStr);
  return date ? WEEKDAYS[date.getDay()] : '';
}

/** "Martes 10 nov". Empty string when the date is invalid. */
export function formatDepartureDay(dateStr: string): string {
  const date = parseIsoDate(dateStr);
  if (!date) return '';
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

/** "Martes 10 nov · 18:30", "Martes 10 nov · Sin horario" or "Nueva salida" when there is no date. */
export function formatDepartureTitle(dateStr: string, schedule: string): string {
  const day = formatDepartureDay(dateStr);
  if (!day) return 'Nueva salida';
  return `${day} · ${schedule || 'Sin horario'}`;
}
