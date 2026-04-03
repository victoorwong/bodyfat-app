export interface Theme {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  accent: string;
  accentDim: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  danger: string;
  isDark: boolean;
}

export const dark: Theme = {
  bg: '#08080F',
  surface: '#13131F',
  surface2: '#1C1C2E',
  border: '#252538',
  accent: '#7C6FE0',
  accentDim: 'rgba(124,111,224,0.18)',
  text: '#F0F0FF',
  textSecondary: '#8080A0',
  textMuted: '#40405A',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
  isDark: true,
};

export const light: Theme = {
  bg: '#F2F2F9',
  surface: '#FFFFFF',
  surface2: '#EBEBF5',
  border: '#DCDCEE',
  accent: '#6C63FF',
  accentDim: 'rgba(108,99,255,0.12)',
  text: '#12122A',
  textSecondary: '#5A5A7A',
  textMuted: '#A0A0BC',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  isDark: false,
};
