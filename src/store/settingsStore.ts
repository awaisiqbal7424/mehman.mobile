import { create } from 'zustand';
import api from '../api/client';

/**
 * Platform-wide config an admin can change from the Admin panel without an
 * app-store release: the guest-facing service fee percentage and the
 * WhatsApp/contact number. Ported from the same store in Mehman.co — see
 * that file's comment for the full rationale. Fetched once at app start
 * (see app/_layout.tsx) and held at these same defaults until that resolves.
 */
interface PlatformSettings {
  serviceFeePercentage: number;
  whatsAppNumber: string;
  contactPhoneDisplay: string;
}

const DEFAULTS: PlatformSettings = {
  serviceFeePercentage: 2,
  whatsAppNumber: '923365364506',
  contactPhoneDisplay: '+92 336 5364506',
};

interface SettingsState extends PlatformSettings {
  fetch: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULTS,
  fetch: async () => {
    try {
      const response = await api.get<Partial<PlatformSettings>>('/api/platform-settings');
      set({ ...DEFAULTS, ...response.data });
    } catch {
      // Keep the defaults — a guest should never see a broken price or dead
      // link just because this one request failed.
    }
  },
}));

/** Applied to the booking subtotal, not the running total — a percentage of a
 *  figure that already contains the fee would be circular. */
export const serviceFeeFor = (subtotal: number, percentage: number): number =>
  Math.round((subtotal || 0) * (percentage / 100));

/** Prefilling the first message saves the person typing it. */
export const buildWhatsAppUrl = (number: string, message?: string): string =>
  `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
