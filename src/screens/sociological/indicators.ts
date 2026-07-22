export type IndicatorKey = 'literacyRate' | 'unemploymentRate' | 'urbanizationRate' | 'perCapitaIncome';

export const INDICATOR_OPTIONS: Array<{ key: IndicatorKey; label: string }> = [
  { key: 'literacyRate', label: 'Literacy rate' },
  { key: 'unemploymentRate', label: 'Unemployment rate' },
  { key: 'urbanizationRate', label: 'Urbanization rate' },
  { key: 'perCapitaIncome', label: 'Per-capita income' },
];

export const Y_LABEL = 'Cases per 100k population';
