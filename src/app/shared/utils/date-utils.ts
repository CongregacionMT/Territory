export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

export function getWeekId(date: Date): string {
  const monday = getMonday(date);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const day = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatWeekRange(dateString: string): string {
  if (!dateString) return '';

  let date: Date;
  if (dateString === 'actual') {
    date = new Date();
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    // Usar T12:00:00 para evitar problemas de zona horaria que puedan mover la fecha al día anterior
    date = new Date(dateString + 'T12:00:00');
  } else {
    return dateString;
  }

  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];

  return `${monday.getDate()} de ${months[monday.getMonth()]} al ${sunday.getDate()} de ${months[sunday.getMonth()]}`;
}

export function parseFirebaseDate(value: unknown): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;

  const asTimestamp = value as { toDate?: () => Date; seconds?: number };
  if (typeof asTimestamp.toDate === 'function') return asTimestamp.toDate();
  if (asTimestamp.seconds) return new Date(asTimestamp.seconds * 1000);

  const parsed = new Date(value as string | number);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Formats a Date as YYYY-MM-DD using the local calendar (never UTC). */
export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses a YYYY-MM-DD string as a local date at midnight. Returns null when invalid. */
export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value || !ISO_DATE_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Adds (or subtracts) whole days to a YYYY-MM-DD string. Returns the input when it is invalid. */
export function addDaysToIsoDate(value: string, days: number): string {
  const date = parseIsoDate(value);
  if (!date) return value;
  date.setDate(date.getDate() + days);
  return toLocalIsoDate(date);
}

/** Whole days between two YYYY-MM-DD strings (b - a), unaffected by DST. Null when invalid. */
export function daysBetweenIsoDates(a: string, b: string): number | null {
  if (!ISO_DATE_PATTERN.test(a) || !ISO_DATE_PATTERN.test(b)) return null;
  const [yearA, monthA, dayA] = a.split('-').map(Number);
  const [yearB, monthB, dayB] = b.split('-').map(Number);
  const utcA = Date.UTC(yearA, monthA - 1, dayA);
  const utcB = Date.UTC(yearB, monthB - 1, dayB);
  if (Number.isNaN(utcA) || Number.isNaN(utcB)) return null;
  return Math.round((utcB - utcA) / MS_PER_DAY);
}
