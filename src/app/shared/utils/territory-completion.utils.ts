import { Card } from '@core/models/Card';

/** Value older cards used to mark a reset card; new cards store an empty `end` instead. */
const LEGACY_RESET_END = '0';

/** A card is a completion only when `end` holds a date. Empty and legacy '0' mean "not completed". */
export function isCompletionEnd(end: unknown): boolean {
  if (!end) return false;
  return typeof end !== 'string' || (end.trim() !== '' && end !== LEGACY_RESET_END);
}

export function getMostRecentTerritoryCompletionDate(cards: readonly Card[]): Date | null {
  const latestCard = getMostRecentCompletedTerritoryCard(cards);
  return latestCard ? parseTerritoryCompletionDate(latestCard.end) : null;
}

export function getMostRecentCompletedTerritoryCard(cards: readonly Card[]): Card | null {
  let latestDate: Date | null = null;
  let latestCard: Card | null = null;

  for (const card of cards) {
    if (!isCompletionEnd(card.end)) continue;

    const completionDate = parseTerritoryCompletionDate(card.end);
    if (completionDate && (!latestDate || completionDate > latestDate)) {
      latestDate = completionDate;
      latestCard = card;
    }
  }

  return latestCard;
}

export function calculateDaysSinceTerritoryCompletion(
  completionDate: Date | null,
  today = new Date(),
): number {
  if (!completionDate) return Infinity;

  const completionDay = Date.UTC(
    completionDate.getFullYear(),
    completionDate.getMonth(),
    completionDate.getDate(),
  );
  const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  return Math.max(0, Math.floor((currentDay - completionDay) / 86_400_000));
}

function parseTerritoryCompletionDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return isValidDate(value) ? value : null;
  }

  if (typeof value === 'number') return createValidDate(value);
  if (typeof value === 'string') return parseTerritoryCompletionDateString(value);
  if (!value || typeof value !== 'object') return null;

  const timestamp = value as { toDate?: () => Date; seconds?: number };
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  return typeof timestamp.seconds === 'number' ? createValidDate(timestamp.seconds * 1000) : null;
}

function parseTerritoryCompletionDateString(value: string): Date | null {
  const normalizedValue = value.trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizedValue);
  const legacyDateMatch = /^(\d{4})[:/-](\d{1,2})[-/]\s*(\d{1,2})$/.exec(normalizedValue);
  const match = dateOnlyMatch ?? legacyDateMatch;

  if (!match) return createValidDate(normalizedValue);

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
    ? date
    : null;
}

function createValidDate(value: string | number): Date | null {
  const date = new Date(value);
  return isValidDate(date) ? date : null;
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}
