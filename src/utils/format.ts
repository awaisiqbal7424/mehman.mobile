/**
 * Every number and date a guest or host reads passes through here.
 *
 * The web app learned this the hard way: `toLocaleDateString()` with no options
 * renders "8/25/2026", which is ambiguous and differs between devices. Phones
 * make it worse — locale is per-device, so two travellers looking at the same
 * departure would see different dates. These helpers fix the format.
 */

const parse = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Sat, 15 Aug 2026" — departures and travel dates. */
export const formatTravelDate = (value?: string | Date | null): string => {
  const d = parse(value);
  return d ? `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : '';
};

/** "15 Aug 2026" — record dates, where the weekday adds nothing. */
export const formatShortDate = (value?: string | Date | null): string => {
  const d = parse(value);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : '';
};

/** "15 Aug" — tight spaces such as calendar chips. */
export const formatDayMonth = (value?: string | Date | null): string => {
  const d = parse(value);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : '';
};

/** "15 – 20 Aug 2026", collapsing a shared month and year. */
export const formatDateRange = (from?: string | Date | null, to?: string | Date | null): string => {
  const a = parse(from);
  const b = parse(to);
  if (!a) return '';
  if (!b) return formatShortDate(a);
  const sameYear = a.getFullYear() === b.getFullYear();
  const sameMonth = sameYear && a.getMonth() === b.getMonth();
  if (sameMonth) return `${a.getDate()} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
  if (sameYear) return `${formatDayMonth(a)} – ${formatDayMonth(b)} ${b.getFullYear()}`;
  return `${formatShortDate(a)} – ${formatShortDate(b)}`;
};

/** "2 hours ago", "Yesterday", "12 Aug" — for message and notification lists. */
export const formatRelative = (value?: string | Date | null): string => {
  const d = parse(value);
  if (!d) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return formatDayMonth(d);
};

/** "14:30" — message timestamps. */
export const formatTime = (value?: string | Date | null): string => {
  const d = parse(value);
  if (!d) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** A date the API will accept: "2026-08-15", with no timezone drift. */
export const toApiDate = (value: Date): string => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const startOfDay = (value: Date): Date =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

export const addDays = (value: Date, days: number): Date => {
  const d = new Date(value);
  d.setDate(d.getDate() + days);
  return d;
};

/** Whole nights between two dates, never negative. */
export const nightsBetween = (from?: Date | null, to?: Date | null): number => {
  if (!from || !to) return 0;
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.max(0, Math.round(ms / 86400000));
};

/* ── money ────────────────────────────────────────────────────────────────── */

/** "PKR 45,000" — the full figure, for totals and anything contractual. */
export const pkr = (amount?: number | null): string => {
  const n = Math.round(amount ?? 0);
  return `PKR ${n.toLocaleString('en-US')}`;
};

/** "45,000" — when the currency is already stated by a nearby label. */
export const amount = (value?: number | null): string =>
  Math.round(value ?? 0).toLocaleString('en-US');

/**
 * "45.0k", "1.2M" — for stat tiles and chart axes only.
 *
 * Never use this where someone is deciding whether to pay: a rounded price is a
 * wrong price.
 */
export const compactPkr = (value?: number | null): string => {
  const n = Math.round(value ?? 0);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
};

/* ── text ─────────────────────────────────────────────────────────────────── */

export const initials = (first?: string, last?: string): string =>
  `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';

/** "1 night" / "3 nights" — saves a pluralisation bug at every call site. */
export const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`;

export const titleCase = (value?: string): string =>
  (value ?? '')
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
