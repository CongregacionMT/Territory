import { describe, expect, it } from 'vitest';
import { getDepartureGroupTheme } from './departure-group-theme';

describe('getDepartureGroupTheme', () => {
  it('gives general departures a color of their own, never a warning color', () => {
    const general = getDepartureGroupTheme(0);

    expect(general.frame).toContain('emerald');
    expect(general.frame).not.toMatch(/amber|yellow|red|orange/);
  });

  it('gives each of the first groups a different shade', () => {
    const frames = [1, 2, 3, 4].map((group) => getDepartureGroupTheme(group).frame);

    expect(new Set(frames).size).toBe(4);
    expect(frames).not.toContain(getDepartureGroupTheme(0).frame);
  });

  it('repeats the shades when there are more groups than shades', () => {
    expect(getDepartureGroupTheme(5)).toBe(getDepartureGroupTheme(1));
    expect(getDepartureGroupTheme(10)).toBe(getDepartureGroupTheme(2));
  });

  it('treats an invalid group as general', () => {
    expect(getDepartureGroupTheme(Number.NaN)).toBe(getDepartureGroupTheme(0));
  });
});
