import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const HIDDEN_KEY = 'mehman_hidden_chats';

interface ChatsState {
  /**
   * conversationId → the ISO time it was "deleted".
   *
   * There is no server-side delete most accounts can rely on yet (see
   * `messageApi.removeConversation`), so a deleted thread is hidden on this
   * device instead. It un-hides itself the moment the conversation's own
   * `updatedAt` moves past the hide time — a new message means the host or
   * guest is still trying to reach you, and a "deleted" chat should not bury
   * that the way it would on a device that genuinely dropped the record.
   */
  hidden: Record<string, string>;
  loaded: boolean;
  load: () => Promise<void>;
  hide: (conversationId: string) => Promise<void>;
  isHidden: (conversationId: string, updatedAt?: string) => boolean;
}

export const useChats = create<ChatsState>((set, get) => ({
  hidden: {},
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(HIDDEN_KEY);
      set({ hidden: raw ? JSON.parse(raw) : {}, loaded: true });
    } catch {
      set({ hidden: {}, loaded: true });
    }
  },

  hide: async (conversationId) => {
    const next = { ...get().hidden, [conversationId]: new Date().toISOString() };
    set({ hidden: next });
    try {
      await AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
    } catch {
      /* best-effort — worst case it reappears after a restart */
    }
  },

  isHidden: (conversationId, updatedAt) => {
    const hiddenAt = get().hidden[conversationId];
    if (!hiddenAt) return false;
    if (!updatedAt) return true;
    return new Date(updatedAt).getTime() <= new Date(hiddenAt).getTime();
  },
}));
