/**
 * Business facts that are not the API's to tell us. Ported verbatim from the
 * traveller web app — if a figure changes it must change in both places, so
 * each one is defined once here and derived everywhere else.
 */

/* ── contact ──────────────────────────────────────────────────────────────── */

export const CONTACT_PHONE_DISPLAY = '+92 336 5364506';

/** wa.me wants digits only: country code, no plus, no leading zero, no spaces. */
const WHATSAPP_NUMBER = '923365364506';

export const whatsAppUrl = (message?: string): string =>
  `https://wa.me/${WHATSAPP_NUMBER}${message ? `?text=${encodeURIComponent(message)}` : ''}`;

export const CONTACT_EMAIL = 'support@mehman.co';
export const CONTACT_ADDRESS = 'Gilgit, GB, Pakistan';
export const WEBSITE_URL = 'https://mehman.co';

/* ── payment ──────────────────────────────────────────────────────────────── */

/**
 * Card payments are not live — there is no gateway integrated — and cash on
 * arrival was withdrawn, so a wallet transfer with an uploaded receipt is the
 * only route to a confirmed booking.
 */
export const WALLET_ACCOUNT = {
  providers: ['Easypaisa', 'JazzCash'] as const,
  accountTitle: 'Awais Iqbal',
  accountNumber: '03365364506',
};

export type PaymentMethodCode = 'WALLET';

/**
 * Mehman's commission, charged to the guest on top of the host's price.
 *
 * Applied to the booking subtotal (the host's price for the nights or seats),
 * not to the running total — charging a percentage of a figure that already
 * contains the fee would be circular.
 */
export const SERVICE_FEE_RATE = 0.02;

export const serviceFeeFor = (subtotal: number): number => Math.round((subtotal || 0) * SERVICE_FEE_RATE);

/** "2%" — kept next to the rate so the label cannot drift from the maths. */
export const SERVICE_FEE_LABEL = `${(SERVICE_FEE_RATE * 100).toFixed(0)}%`;

/* ── copy ─────────────────────────────────────────────────────────────────── */

/** Fallback imagery when a listing has no photo of its own. */
export const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=70';

export const LEGAL_URLS = {
  terms: 'https://mehman.co/terms',
  privacy: 'https://mehman.co/privacy',
  refunds: 'https://mehman.co/cancellation-policy',
};
