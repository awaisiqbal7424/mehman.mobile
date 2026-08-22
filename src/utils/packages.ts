import type { PackageAvailability, ProviderPackage } from '../types';

/**
 * Central helpers for the four marketplace package types. Ported from the
 * traveller web app so the two clients cannot disagree about what a "TOUR"
 * costs or how it is booked.
 *
 * TOUR    — multi-day operator packages (booked against a departure slot)
 * GUIDE   — tour-guide hires, day treks, heritage walks (departure slot)
 * STAY    — hotels, guesthouses, huts (check-in/check-out, price per night)
 * VEHICLE — jeeps, coasters, cars with driver (pickup/drop-off, price per day)
 */

export type PackageType = 'TOUR' | 'STAY' | 'GUIDE' | 'VEHICLE';

/** Slot-based types book against a departure. */
export const isSlotBased = (t?: string): boolean => t === 'TOUR' || t === 'GUIDE';

/** Date-range types book with a start and an end date. */
export const isDateRange = (t?: string): boolean => t === 'STAY' || t === 'VEHICLE';

export const typeLabel = (t?: string): string =>
  ({ TOUR: 'Tour', STAY: 'Stay', GUIDE: 'Guide', VEHICLE: 'Vehicle' } as Record<string, string>)[t ?? ''] ??
  'Package';

/** Which price field the type uses. */
export const packagePrice = (pkg: Pick<ProviderPackage, 'packageType' | 'price' | 'pricePerNight'>): number =>
  (isSlotBased(pkg.packageType) ? pkg.price : pkg.pricePerNight) ?? 0;

export const priceUnit = (t?: string): string =>
  ({ TOUR: 'per person', GUIDE: 'per person', STAY: 'per night', VEHICLE: 'per day' } as Record<string, string>)[
    t ?? ''
  ] ?? '';

/**
 * `live: false` keeps a type working end-to-end (detail screens, existing
 * bookings, deep links) while hiding it from every browse surface. Guides and
 * vehicles are not offered yet — flip `live` to bring them back; nothing else
 * needs to change.
 */
export const SEARCH_TABS: { slug: string; type: PackageType; label: string; icon: string; live: boolean }[] = [
  { slug: 'tours', type: 'TOUR', label: 'Tours', icon: 'map', live: true },
  { slug: 'stays', type: 'STAY', label: 'Stays', icon: 'bed', live: true },
  { slug: 'guides', type: 'GUIDE', label: 'Guides', icon: 'compass', live: false },
  { slug: 'vehicles', type: 'VEHICLE', label: 'Vehicles', icon: 'car', live: false },
];

export const LIVE_SEARCH_TABS = SEARCH_TABS.filter((t) => t.live);

export const slugToType = (slug: string): PackageType =>
  SEARCH_TABS.find((t) => t.slug === slug)?.type ?? 'TOUR';

/**
 * Reads one of the API's JSON-in-a-string columns (`imagesJson`,
 * `amenitiesJson`, `tourHighlightsJson`, …).
 *
 * These arrive as text and are sometimes empty, sometimes `"[]"`, sometimes
 * malformed. Every caller wants "an array, possibly empty" and none of them
 * want to think about it, so parsing failures return `[]` rather than throwing
 * a screen away.
 */
export function parseJsonArray<T = string>(value?: string | null): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Every image for a package, thumbnail first, with duplicates removed. */
export function packageImages(pkg?: Partial<ProviderPackage> | null): string[] {
  if (!pkg) return [];
  const gallery = parseJsonArray<string | { url?: string }>(pkg.imagesJson)
    .map((entry) => (typeof entry === 'string' ? entry : entry?.url))
    .filter((url): url is string => Boolean(url));
  const all = pkg.thumbImageUrl ? [pkg.thumbImageUrl, ...gallery] : gallery;
  return Array.from(new Set(all));
}

/** How long a tour runs, phrased the way an itinerary would say it. */
export function durationLabel(pkg: Pick<ProviderPackage, 'durationDays' | 'durationNights'>): string {
  const days = pkg.durationDays ?? 0;
  const nights = pkg.durationNights ?? 0;
  if (!days && !nights) return '';
  if (days && nights) return `${days}D / ${nights}N`;
  return days ? `${days} days` : `${nights} nights`;
}

/** The nearest bookable departure, for the "spots left" indicator on a tour card. */
export function nextTourSlot(slots?: PackageAvailability[]): PackageAvailability | undefined {
  return slots?.find((s) => s.isAvailable !== false);
}

/** Booking statuses, with the tone each should be shown in. */
export const BOOKING_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  PENDING: { label: 'Awaiting confirmation', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'success' },
  COMPLETED: { label: 'Completed', tone: 'info' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  NO_SHOW: { label: 'No show', tone: 'danger' },
};

export const TRIP_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  SUBMITTED: { label: 'With the operator', tone: 'warning' },
  QUOTE_SENT: { label: 'Quote ready', tone: 'info' },
  CONFIRMED: { label: 'Confirmed', tone: 'success' },
  ONGOING: { label: 'Under way', tone: 'success' },
  COMPLETED: { label: 'Completed', tone: 'info' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
};
