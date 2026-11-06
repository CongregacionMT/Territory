const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;

/** "Hace 3d", "Hace 2 sem", "Hace 1 mes", "Hace 4 meses". */
export function formatDaysAgo(days: number): string {
  if (days < DAYS_PER_WEEK) return `Hace ${days}d`;
  if (days < DAYS_PER_MONTH) return `Hace ${Math.floor(days / DAYS_PER_WEEK)} sem`;
  const months = Math.floor(days / DAYS_PER_MONTH);
  return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
}

/** Same as formatDaysAgo, but "Nunca" for territories that were never completed. */
export function formatTerritoryAge(days: number): string {
  return Number.isFinite(days) ? formatDaysAgo(days) : 'Nunca';
}
