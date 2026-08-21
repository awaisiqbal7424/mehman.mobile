import { create } from 'zustand';
import { wishlistApi } from '../api/services';
import type { Wishlist } from '../types';

interface WishlistState {
  /** packageId → the wishlist row's id, which is what removal needs. */
  entries: Record<string, string>;
  loaded: boolean;
  load: (userId: string) => Promise<void>;
  toggle: (userId: string, packageId: string, providerId?: string) => Promise<boolean>;
  isSaved: (packageId: string) => boolean;
  clear: () => void;
}

/**
 * The saved-listings heart.
 *
 * Kept in its own store rather than React Query because the heart appears on
 * every card on every screen: a single map of what is saved is cheaper than a
 * per-card query, and it lets the toggle update optimistically so the heart
 * fills the instant it is tapped rather than after a round trip.
 */
export const useWishlist = create<WishlistState>((set, get) => ({
  entries: {},
  loaded: false,

  load: async (userId) => {
    try {
      const rows: Wishlist[] = await wishlistApi.mine(userId);
      const entries: Record<string, string> = {};
      rows.forEach((row) => {
        const key = row.packageId ?? row.providerId;
        if (key) entries[key] = row.id;
      });
      set({ entries, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  /** Returns the new saved state, so the caller can word its confirmation. */
  toggle: async (userId, packageId, providerId) => {
    const { entries } = get();
    const existingId = entries[packageId];

    if (existingId) {
      // Optimistic: drop it now, put it back only if the server refuses.
      const next = { ...entries };
      delete next[packageId];
      set({ entries: next });
      try {
        await wishlistApi.remove(existingId);
      } catch {
        set({ entries: { ...get().entries, [packageId]: existingId } });
        throw new Error('Could not remove this from your saved list.');
      }
      return false;
    }

    // A placeholder id keeps the heart filled until the real row comes back.
    set({ entries: { ...entries, [packageId]: 'pending' } });
    try {
      const created = await wishlistApi.add({ userId, packageId, providerId });
      set({ entries: { ...get().entries, [packageId]: created.id } });
      return true;
    } catch {
      const reverted = { ...get().entries };
      delete reverted[packageId];
      set({ entries: reverted });
      throw new Error('Could not save this. Check your connection and try again.');
    }
  },

  isSaved: (packageId) => Boolean(get().entries[packageId]),

  clear: () => set({ entries: {}, loaded: false }),
}));
