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
  backgroundGradient: [
    'rgba(234,88,12,0.28)',
    'rgba(255,237,213,0.72)',
    'rgba(255,255,255,0.96)',
    'rgba(28,25,23,0.06)',
  ],
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

/**
 * Corner radii.
 *
 * Softer than they were: the current platform direction (iOS 26 and Material's
 * expressive update alike) rounds everything harder, and the two things people
 * touch most — fields and the tab bar — go fully pill. A pill reads as "this is
 * a control" without needing a border to say so.
 */
export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  '2xl': 32,
  full: 999,
} as const;

/**
 * Type scale, sized to the current iOS metrics: 17pt primary text, 15pt
 * secondary, 34pt page titles, 11pt tab labels.
 *
 * The old scale started at 15pt for body, which is a *web* body size — on a
 * phone held at arm's length it reads as fine print. Large sizes carry tight
 * tracking so they do not look airy; body stays at default tracking.
 */
export const type = {
  display: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const, letterSpacing: -0.8 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const, letterSpacing: -0.3 },
  subheading: { fontSize: 17, lineHeight: 23, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontSize: 17, lineHeight: 24, fontWeight: '600' as const },
  small: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  smallStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.4 },
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

/**
 * The floating tab bar.
 *
 * It is a pill inset from all three edges rather than a full-width slab, so
 * content runs under it and the app reads as one card floating on the warm
 * ground. `SPACE` is what a scrolling screen must add to its bottom padding to
 * clear the pill — `Screen` applies it automatically inside a tab navigator.
 */
export const TAB_BAR = {
  HEIGHT: 64,
  /** Inset from the left, right and bottom edges. */
  INSET: 16,
  get SPACE() {
    return this.HEIGHT + this.INSET + spacing.md;
  },
} as const;

export const theme = { colors, palette, spacing, radius, type, shadow };
export default theme;
