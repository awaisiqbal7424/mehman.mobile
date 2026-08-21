import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * The one HTTP client for both halves of the app.
 *
 * Two things differ from the web version this is ported from:
 *
 * 1. There is no Vite dev proxy on a phone, so the absolute origin is always
 *    used. It comes from app.json (`extra.apiUrl`) so a build can be pointed at
 *    staging without touching code.
 * 2. The JWT lives in the device keychain (expo-secure-store), not
 *    localStorage. SecureStore is async and axios interceptors are not, so the
 *    token is mirrored in memory and `hydrateToken()` fills it once at boot.
 */

export const API_BASE_URL: string =
  // EXPO_PUBLIC_* is inlined at build time, so a build can be pointed at
  // staging (or at a local proxy, which is the only way to exercise the web
  // preview — the API sends CORS headers for mehman.co, not for localhost)
  // without editing app.json.
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ||
  'https://backend.mehman.co';

const TOKEN_KEY = 'mehman_jwt';

let memoryToken: string | null = null;

/** SecureStore has no web implementation; fall back so `expo start --web` runs. */
const store = {
  get: async (key: string) =>
    Platform.OS === 'web' ? globalThis.localStorage?.getItem(key) ?? null : SecureStore.getItemAsync(key),
  set: async (key: string, value: string) =>
    Platform.OS === 'web' ? void globalThis.localStorage?.setItem(key, value) : SecureStore.setItemAsync(key, value),
  remove: async (key: string) =>
    Platform.OS === 'web' ? void globalThis.localStorage?.removeItem(key) : SecureStore.deleteItemAsync(key),
};

export const getToken = () => memoryToken;

export async function hydrateToken(): Promise<string | null> {
  try {
    memoryToken = await store.get(TOKEN_KEY);
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

export async function setToken(token: string): Promise<void> {
  memoryToken = token;
  await store.set(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  memoryToken = null;
  await store.remove(TOKEN_KEY);
}

/**
 * Called when the server rejects a token we believed was good. The auth store
 * registers itself here at startup; the client itself must not know about
 * navigation, which is what made the web version hard-reload the page.
 */
type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler = () => {};
export const setSessionExpiredHandler = (fn: SessionExpiredHandler) => {
  onSessionExpired = fn;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (memoryToken) config.headers.Authorization = `Bearer ${memoryToken}`;
  return config;
});

/** Endpoints where a 401 is an answer ("wrong password"), not an expired session. */
const AUTH_ENDPOINTS = [
  '/api/authenticate',
  '/api/register',
  '/api/activate',
  '/api/account/reset-password',
];

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url ?? '';
    const isAuthCall = AUTH_ENDPOINTS.some((path) => url.includes(path));
    if (error.response?.status === 401 && !isAuthCall && memoryToken) {
      void clearToken();
      onSessionExpired();
    }
    return Promise.reject(error);
  },
);

/**
 * Turns any axios failure into a sentence worth showing a traveller.
 *
 * The backend returns problem-details JSON, so `title`/`detail` carry the real
 * reason; falling straight through to `error.message` surfaces "Request failed
 * with status code 400", which tells nobody anything.
 */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const err = error as AxiosError<{ title?: string; message?: string; detail?: string; errorKey?: string }>;
  if (err?.code === 'ECONNABORTED') return 'The connection timed out. Check your signal and try again.';
  if (err?.message === 'Network Error') return 'No internet connection. Check your signal and try again.';
  const data = err?.response?.data;
  return data?.detail || data?.title || data?.message || fallback;
}

export default api;
