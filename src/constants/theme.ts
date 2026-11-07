import { Platform } from 'react-native';

export const colors = {
  primary: '#123D2C',
  primaryDark: '#0B2A1E',
  primaryLight: '#1D5A42',
  accent: '#3FA66B',
  accentSoft: '#E4F3EA',
  background: '#F6F8F4',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2EA',
  surfaceInverse: '#123D2C',
  text: '#15241C',
  textSecondary: '#54645B',
  textMuted: '#7A8A80',
  textInverse: '#F6FBF7',
  border: '#E1E7DE',
  borderStrong: '#CBD5C6',
  low: '#2F9E5F',
  lowSoft: '#E4F4EA',
  medium: '#C98A13',
  mediumSoft: '#FBF1DC',
  high: '#C0392B',
  highSoft: '#FBE7E4',
  unknown: '#82908A',
  unknownSoft: '#EDF0EE',
  info: '#2D6E8E',
  infoSoft: '#E5F0F5',
  warning: '#9A6408',
  warningSoft: '#FCF2DD',
  danger: '#B03225',
  dangerSoft: '#FBE7E4',
  success: '#2F8A55',
  successSoft: '#E4F4EA',
  overlay: 'rgba(11, 42, 30, 0.45)',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
  subheading: { fontSize: 17, lineHeight: 23, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  smallStrong: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: '500' as const },
  tiny: { fontSize: 10, lineHeight: 13, fontWeight: '600' as const },
} as const;

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#143225',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: { elevation: 2 },
    default: {
      shadowColor: '#143225',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
  }),
  raised: Platform.select({
    ios: {
      shadowColor: '#143225',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 20,
    },
    android: { elevation: 4 },
    default: {
      shadowColor: '#143225',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 20,
    },
  }),
} as const;

export const riskTone = {
  low: { label: 'Low risk', color: colors.low, soft: colors.lowSoft },
  medium: { label: 'Medium risk', color: colors.medium, soft: colors.mediumSoft },
  high: { label: 'High risk', color: colors.high, soft: colors.highSoft },
  unknown: { label: 'Not assessed', color: colors.unknown, soft: colors.unknownSoft },
} as const;

export const maxContentWidth = 720;
export const tabBarHeight = 60;
