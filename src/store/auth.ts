import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { clearToken, hydrateToken } from '../api/client';
import { authApi, hostApi } from '../api/services';
import type { AppRole, LoginRequest, ProviderStatus, RegisterRequest, ServiceProvider, User } from '../types';

const ROLE_KEY = 'mehman_role';

/**
 * Decides which business a host is looking at, and what state they are in.
 *
 * Ported from the provider panel: an account can own several businesses, and
 * the one that matters is the first approved one. An account whose businesses
 * are *all* rejected is rejected; anything else with a business is pending.
 */
function resolveProvider(providers: ServiceProvider[]): {
  provider: ServiceProvider | null;
  status: ProviderStatus;
} {
  if (providers.length === 0) return { provider: null, status: 'none' };
  const approved = providers.find((p) => p.isApproved === true);
  if (approved) return { provider: approved, status: 'approved' };
  if (providers.every((p) => p.isReject === true)) return { provider: providers[0], status: 'rejected' };
  return { provider: providers[0], status: 'pending' };
}

interface AuthState {
  /** True until the stored token has been read and the account fetched once. */
  initialising: boolean;
  user: User | null;
  providers: ServiceProvider[];
  /** The business the host panel is currently acting as. */
  provider: ServiceProvider | null;
  providerStatus: ProviderStatus;
  /** Which half of the app is on screen. */
  role: AppRole;

  bootstrap: () => Promise<void>;
  login: (credentials: LoginRequest) => Promise<User>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  refreshProviders: () => Promise<void>;
  setRole: (role: AppRole) => Promise<void>;
  setActiveProvider: (providerId: string) => void;
  /** Called by the API client when the server rejects a token we thought was good. */
  handleSessionExpired: () => void;
}

const signedOut = {
  user: null,
  providers: [] as ServiceProvider[],
  provider: null,
  providerStatus: 'none' as ProviderStatus,
  role: 'guest' as AppRole,
};

export const useAuth = create<AuthState>((set, get) => ({
  initialising: true,
  ...signedOut,

  /**
   * Runs once at launch, behind the splash screen.
   *
   * The host lookup is deliberately allowed to fail on its own: a guest account
   * has no provider record, and `/api/provider/my` answering 403 for them must
   * not look like a broken session.
   */
  bootstrap: async () => {
    const token = await hydrateToken();
    if (!token) {
      set({ ...signedOut, initialising: false });
      return;
    }

    try {
      const user = await authApi.getAccount();
      const savedRole = (await AsyncStorage.getItem(ROLE_KEY)) as AppRole | null;
      set({ user });

      const providers = await hostApi.myProviders().catch(() => [] as ServiceProvider[]);
      const resolved = resolveProvider(providers);

      // Only restore the host view if they still have an approved business.
      const role: AppRole = savedRole === 'host' && resolved.status === 'approved' ? 'host' : 'guest';

      set({ providers, ...resolved, role, initialising: false });
    } catch {
      await clearToken();
      set({ ...signedOut, initialising: false });
    }
  },

  login: async (credentials) => {
    await authApi.login(credentials);
    const user = await authApi.getAccount();
    const providers = await hostApi.myProviders().catch(() => [] as ServiceProvider[]);
    const resolved = resolveProvider(providers);

    set({ user, providers, ...resolved, role: 'guest', initialising: false });
    return user;
  },

  /**
   * Creates the account but does not sign in: the backend sends an activation
   * email first, so a token would be refused anyway. The sign-up screen tells
   * the person to check their inbox.
   */
  register: async (data) => {
    await authApi.register(data);
  },

  logout: async () => {
    await clearToken();
    await AsyncStorage.removeItem(ROLE_KEY);
    set({ ...signedOut, initialising: false });
  },

  refreshAccount: async () => {
    try {
      set({ user: await authApi.getAccount() });
    } catch {
      /* keep the last known account; the next bootstrap reconciles */
    }
  },

  /** Used after host onboarding, when a brand-new business should appear. */
  refreshProviders: async () => {
    try {
      const providers = await hostApi.myProviders();
      set({ providers, ...resolveProvider(providers) });
    } catch {
      /* a failed refresh must never be reported as a failed mutation */
    }
  },

  setRole: async (role) => {
    set({ role });
    await AsyncStorage.setItem(ROLE_KEY, role);
  },

  setActiveProvider: (providerId) => {
    const match = get().providers.find((p) => p.id === providerId);
    if (match) set({ provider: match });
  },

  handleSessionExpired: () => {
    set({ ...signedOut, initialising: false });
  },
}));

/* ── selectors ────────────────────────────────────────────────────────────── */

export const useIsSignedIn = () => useAuth((s) => Boolean(s.user));

/** True when the account has an approved business and may open the host side. */
export const useCanHost = () => useAuth((s) => s.providerStatus === 'approved');

export const useDisplayName = () =>
  useAuth((s) => (s.user ? `${s.user.firstName ?? ''} ${s.user.lastName ?? ''}`.trim() || s.user.userName : ''));
