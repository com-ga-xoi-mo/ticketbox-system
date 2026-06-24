import { MD3LightTheme } from 'react-native-paper';

/**
 * Light MD3 theme matching the TicketBox check-in mockups: light slate background,
 * white surfaces, royal-blue primary action color.
 */
export const paperTheme = {
  ...MD3LightTheme,
  roundness: 3,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1d4ed8',
    onPrimary: '#ffffff',
    background: '#eef1f5',
    surface: '#ffffff',
    onSurface: '#0f172a',
    onSurfaceVariant: '#64748b',
    outline: '#d6deea',
  },
};

/** Flat color tokens read from the mockups, for custom (non-Paper) styling. */
export const ui = {
  bg: '#eef1f5',
  card: '#ffffff',
  border: '#e3e8f0',
  primary: '#1d4ed8',
  primarySoft: '#eaf0fe',
  textPrimary: '#0f172a',
  textMuted: '#64748b',
  label: '#94a3b8',
  inputBg: '#f8fafc',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  online: '#22c55e',
} as const;
