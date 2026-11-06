export interface DepartureColorOption {
  value: string;
  label: string;
  /** Same hue the public departures page paints for this color. */
  hex: string;
}

/** Colors the public departures page can paint. Any other stored value renders as gray there. */
export const DEPARTURE_COLOR_OPTIONS: readonly DepartureColorOption[] = [
  { value: 'secondary', label: 'Gris', hex: '#475569' },
  { value: 'primary', label: 'Azul', hex: '#2563eb' },
  { value: 'success', label: 'Verde', hex: '#059669' },
  { value: 'danger', label: 'Rojo', hex: '#dc2626' },
  { value: 'warning', label: 'Amarillo', hex: '#f59e0b' },
  { value: 'info', label: 'Celeste', hex: '#0891b2' },
];

export const DEFAULT_DEPARTURE_COLOR = 'secondary';

export function normalizeDepartureColor(value: string | null | undefined): string {
  return DEPARTURE_COLOR_OPTIONS.some((option) => option.value === value)
    ? (value as string)
    : DEFAULT_DEPARTURE_COLOR;
}
