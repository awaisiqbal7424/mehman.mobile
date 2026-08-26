import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, getToken } from '../api/client';

const HUB_URL = `${API_BASE_URL}/hubs/chat`;

/**
 * Keeps the inbox and the unread badge live.
 *
 * ChatHub puts every connection into its own `user_{id}` group on connect, so
 * there is nothing to join here — a message arriving in any of the caller's
 * conversations comes through as `ConversationUpdated`, even for a thread that
 * isn't open. We refetch rather than patch the cache: the list rows carry a
 * preview, a timestamp and an unread count that the server computes, and
 * rebuilding all that on the client would only be a second place to get it
 * wrong.
 *
 * Like the per-conversation socket, it drops on background and comes back on
 * resume, and stays silent on failure — the screen's own polling still covers it.
 */
export function useLiveInbox(enabled: boolean) {
  const queryClient = useQueryClient();
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const start = async () => {
      const token = getToken();
      if (!token || connectionRef.current) return;

      const connection = new HubConnectionBuilder()
        .withUrl(HUB_URL, { accessTokenFactory: () => token ?? '' })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(LogLevel.Error)
        .build();

      connection.on('ConversationUpdated', () => {
        void queryClient.invalidateQueries({ queryKey: ['conversations'] });
        void queryClient.invalidateQueries({ queryKey: ['unread-count'] });
        void queryClient.invalidateQueries({ queryKey: ['host-conversations'] });
        void queryClient.invalidateQueries({ queryKey: ['host-unread'] });
      });

      try {
        await connection.start();
        if (cancelled) {
          void connection.stop();
          return;
        }
        connectionRef.current = connection;
      } catch {
        /* polling covers us */
      }
    };

    const stop = async () => {
      const connection = connectionRef.current;
      connectionRef.current = null;
      if (connection) await connection.stop().catch(() => {});
    };

    void start();

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void start();
      else void stop();
    });

    return () => {
      cancelled = true;
      subscription.remove();
      void stop();
    };
  }, [enabled, queryClient]);
}
