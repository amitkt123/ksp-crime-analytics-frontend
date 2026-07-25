export type IndicatorKey = 'literacyRate' | 'unemploymentRate' | 'urbanizationRate' | 'perCapitaIncome';

// color is fixed per indicator (identity), never reassigned by display/sort rank --
// otherwise "unemployment" would change hue depending on which panel currently ranks
// strongest, which breaks color-as-identity for anyone tracking a panel across renders.
export const INDICATOR_OPTIONS: Array<{ key: IndicatorKey; label: string; color: string }> = [
  { key: 'literacyRate', label: 'Literacy rate', color: 'var(--indicator-3)' },
  { key: 'unemploymentRate', label: 'Unemployment rate', color: 'var(--indicator-1)' },
  { key: 'urbanizationRate', label: 'Urbanization rate', color: 'var(--indicator-2)' },
  { key: 'perCapitaIncome', label: 'Per-capita income', color: 'var(--indicator-4)' },
];

export const Y_LABEL = 'Cases per 100k population';
