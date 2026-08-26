/**
 * Business facts that are not the API's to tell us. Ported verbatim from the
 * traveller web app — if a figure changes it must change in both places, so
 * each one is defined once here and derived everywhere else.
 */

/* ── contact ──────────────────────────────────────────────────────────────── */

// The WhatsApp number and its display form are admin-configurable now — see
// src/store/settingsStore.ts (useSettingsStore + buildWhatsAppUrl). Changing
// either from the Admin panel used to mean an app-store release.

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

// Mehman's commission, charged to the guest on top of the host's price, is
// admin-configurable now too — see src/store/settingsStore.ts
// (useSettingsStore + serviceFeeFor).

/* ── copy ─────────────────────────────────────────────────────────────────── */

/** Fallback imagery when a listing has no photo of its own. */
export const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=70';
