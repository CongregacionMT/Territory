import { describe, expect, it } from 'vitest';
import { Card } from '@core/models/Card';
import {
  calculateDaysSinceTerritoryCompletion,
  getMostRecentCompletedTerritoryCard,
  getMostRecentTerritoryCompletionDate,
  isCompletionEnd,
} from './territory-completion.utils';

describe('territory completion utilities', () => {
  it('uses the newest completion date instead of the card creation order', () => {
    const updatedOldCard: Card = {
      creation: new Date(2026, 5, 1),
      end: '2026-10-28',
    };
    const cards: Card[] = [
      { creation: new Date(2026, 9, 30), end: '2026-06-02' },
      { end: '0' },
      updatedOldCard,
      { end: '2026-03-15' },
    ];

    expect(getMostRecentTerritoryCompletionDate(cards)).toEqual(new Date(2026, 9, 28));
    expect(getMostRecentCompletedTerritoryCard(cards)).toBe(updatedOldCard);
  });

  it('supports legacy completion date strings', () => {
    expect(getMostRecentTerritoryCompletionDate([{ end: '2026:10- 28' }])).toEqual(
      new Date(2026, 9, 28),
    );
  });

  it('returns no date when there is no completed card', () => {
    expect(getMostRecentTerritoryCompletionDate([{ end: '0' }, { end: '' }])).toBeNull();
  });

  it('calculates elapsed calendar days without treating future dates as past', () => {
    const today = new Date(2026, 10, 1, 15);

    expect(calculateDaysSinceTerritoryCompletion(new Date(2026, 9, 28, 22), today)).toBe(4);
    expect(calculateDaysSinceTerritoryCompletion(new Date(2026, 10, 2), today)).toBe(0);
    expect(calculateDaysSinceTerritoryCompletion(null, today)).toBe(Infinity);
  });
});

describe('isCompletionEnd', () => {
  it.each([undefined, null, '', '   ', '0'])('treats %j as not completed', (value) => {
    expect(isCompletionEnd(value)).toBe(false);
  });

  it.each(['2026-06-14', new Date(2026, 5, 14), { seconds: 1_781_000_000 }])(
    'treats %j as completed',
    (value) => {
      expect(isCompletionEnd(value)).toBe(true);
    },
  );
});
