export interface DepartureGroupTheme {
  /** Classes for the box that frames every departure of the group. */
  frame: string;
  /** Classes for the small bar next to the group title. */
  bar: string;
  /** Classes for the compact row shown when the group has no departures. */
  emptyRow: string;
}

const GENERAL_THEME: DepartureGroupTheme = {
  frame: 'rounded-3xl border-2 border-emerald-400/70 bg-emerald-500/10 p-2 sm:p-4',
  bar: 'bg-emerald-400',
  emptyRow: 'border-emerald-400/70 bg-emerald-500/10',
};

/** Shades of light blue, one per group, repeated when there are more groups than shades. */
const GROUP_THEMES: readonly DepartureGroupTheme[] = [
  {
    frame: 'rounded-3xl border-2 border-sky-400/70 bg-sky-500/10 p-2 sm:p-4',
    bar: 'bg-sky-400',
    emptyRow: 'border-sky-400/70 bg-sky-500/10',
  },
  {
    frame: 'rounded-3xl border-2 border-cyan-400/70 bg-cyan-500/10 p-2 sm:p-4',
    bar: 'bg-cyan-400',
    emptyRow: 'border-cyan-400/70 bg-cyan-500/10',
  },
  {
    frame: 'rounded-3xl border-2 border-blue-400/70 bg-blue-500/10 p-2 sm:p-4',
    bar: 'bg-blue-400',
    emptyRow: 'border-blue-400/70 bg-blue-500/10',
  },
  {
    frame: 'rounded-3xl border-2 border-indigo-400/70 bg-indigo-500/10 p-2 sm:p-4',
    bar: 'bg-indigo-400',
    emptyRow: 'border-indigo-400/70 bg-indigo-500/10',
  },
];

/** General departures (group 0) get their own color; each group gets a shade of light blue. */
export function getDepartureGroupTheme(group: number): DepartureGroupTheme {
  if (!Number.isFinite(group) || group <= 0) return GENERAL_THEME;
  return GROUP_THEMES[(Math.floor(group) - 1) % GROUP_THEMES.length];
}
