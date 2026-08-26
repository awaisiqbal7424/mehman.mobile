import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { API_BASE_URL, getToken } from '../api/client';
import type { Message } from '../types';

// ChatHub, not NotificationHub. This pointed at /hubs/notifications, whose hub
// class has no JoinConversation and never emits ReceiveMessage — so the invoke
// below threw into a silent catch and no live message ever arrived.
const HUB_URL = `${API_BASE_URL}/hubs/chat`;

/**
 * Keeps one conversation live.
 *
 * The socket is opened when the chat screen mounts and closed when it leaves —
 * and, crucially, also when the app goes to the background. A SignalR
 * connection held open behind a locked screen drains battery and gets killed by
 * the OS anyway; reconnecting on resume is cheaper and more reliable than
 * pretending the connection survived.
 *
 * Delivery is best-effort by design. If the socket never connects, the chat
 * screen's polling still brings messages in — it is just less immediate. So
 * nothing here surfaces an error to the person typing.
 */
export function useLiveMessages(conversationId: string | undefined, onMessage: (message: Message) => void) {
  const connectionRef = useRef<HubConnection | null>(null);
  // Kept in a ref so a re-render with a new closure does not tear the socket
  // down and build it again.
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    if (!conversationId) return;

    let cancelled = false;

    const start = async () => {
      const token = getToken();
      if (!token || connectionRef.current) return;

      const connection = new HubConnectionBuilder()
        .withUrl(HUB_URL, { accessTokenFactory: () => token ?? '' })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(LogLevel.Error)
        .build();

      connection.on('ReceiveMessage', (message: Message) => {
        if (message?.conversationId === conversationId) handlerRef.current(message);
      });

      try {
        await connection.start();
        if (cancelled) {
          void connection.stop();
          return;
        }
        connectionRef.current = connection;
        // Joining the conversation group is what scopes the feed server-side.
        await connection.invoke('JoinConversation', conversationId).catch(() => {});
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
  }, [conversationId]);
}
