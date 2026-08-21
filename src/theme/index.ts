import { Platform } from 'react-native';

/**
 * The single source of visual truth for the app.
 *
 * Values are carried over from the web apps (tailwind.config.js) so a guest who
 * knows mehman.co recognises the mobile app instantly — the orange, the cream
 * surfaces, the generous corner radii. Everything else here exists because a
 * phone needs decisions the web never had to make: tap targets, elevation that
 * reads on both platforms, and type that stays legible at arm's length.
 */

export const palette = {
  /** Brand orange. 600 is the action colour; 700 is its pressed state. */
  orange50: '#FFF7ED',
  orange100: '#FFEDD5',
  orange200: '#FED7AA',
  orange300: '#FDBA74',
  orange400: '#FB923C',
  orange500: '#F97316',
  orange600: '#EA580C',
  orange700: '#C2410C',
  orange800: '#9A3412',
  orange900: '#7C2D12',

  ink900: '#1C1917',
  ink800: '#292524',
  ink700: '#44403C',
  ink600: '#57534E',
  ink500: '#78716C',
  ink400: '#A8A29E',
  ink300: '#D6D3D1',
  ink200: '#E7E5E4',
  ink100: '#F5F5F4',
  ink50: '#FAFAF9',

  white: '#FFFFFF',
  black: '#000000',

  green600: '#059669',
  green50: '#ECFDF5',
  amber600: '#D97706',
  amber50: '#FFFBEB',
  red600: '#DC2626',
  red50: '#FEF2F2',
  blue600: '#2563EB',
  blue50: '#EFF6FF',
} as const;

export const colors = {
  /** Page background. Warm rather than pure white — it flatters the photography. */
  background: palette.orange50,
  /** Cards, sheets, bars. */
  surface: palette.white,
  surfaceMuted: palette.ink100,
  surfaceSunken: palette.ink50,

  primary: palette.orange600,
  primaryPressed: palette.orange700,
  primarySoft: palette.orange100,
  primaryOn: palette.white,

  text: palette.ink900,
  textSecondary: palette.ink600,
  textMuted: palette.ink500,
  textOnPrimary: palette.white,
  textInverse: palette.white,

  border: palette.ink200,
  borderStrong: palette.ink300,

  success: palette.green600,
  successSoft: palette.green50,
  warning: palette.amber600,
  warningSoft: palette.amber50,
  danger: palette.red600,
  dangerSoft: palette.red50,
  info: palette.blue600,
  infoSoft: palette.blue50,

  star: '#F59E0B',
  scrim: 'rgba(28,25,23,0.55)',
} as const;

/** A 4pt scale. Every margin and padding in the app comes from here. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  full: 999,
} as const;

/**
 * Type scale. `display` and `title` use tight tracking so large text does not
 * look airy; body text stays at default tracking for readability.
 */
export const type = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const, letterSpacing: -0.6 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const, letterSpacing: -0.4 },
  heading: { fontSize: 19, lineHeight: 25, fontWeight: '700' as const, letterSpacing: -0.2 },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  smallStrong: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: '600' as const, letterSpacing: 0.3 },
} as const;

/**
 * Elevation. iOS gets a soft shadow, Android gets its own elevation token —
 * cross-rendering one platform's shadow on the other always looks wrong.
 */
export const shadow = {
  none: {},
  sm: Platform.select({
    ios: { shadowColor: palette.ink900, shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    android: { elevation: 1 },
    default: {},
  }),
  md: Platform.select({
    ios: { shadowColor: palette.ink900, shadowOpacity: 0.09, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } },
    android: { elevation: 3 },
    default: {},
  }),
  lg: Platform.select({
    ios: { shadowColor: palette.ink900, shadowOpacity: 0.13, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
    android: { elevation: 8 },
    default: {},
  }),
} as const;

/** Anything tappable is at least this tall. Below 44pt, taps start missing. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
export const MIN_TAP = 44;

export const theme = { colors, palette, spacing, radius, type, shadow };
export default theme;
