/**
 * Jobocate palette + spacing/typography constants.
 * Mirrors the cream/green surface used across the web /app.
 */
export const colors = {
  cream: '#EFF0EC',
  green: '#2F7D3A',
  greenBright: '#4DBE55',
  dark: '#21251F',
  ink: '#2A2F28',
  // supporting neutrals
  white: '#FFFFFF',
  card: '#FFFFFF',
  border: '#DCDED6',
  muted: '#6B7166',
  danger: '#B4432E',
  success: '#2F7D3A',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  title: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '600' as const },
} as const;
