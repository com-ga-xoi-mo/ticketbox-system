import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../auth/AuthContext';
import { fetchNotificationStreamToken, notificationKeys } from './notifications';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

/**
 * Opens a Server-Sent Events stream while the user is authenticated and, on each
 * "new notification" signal, invalidates the notification queries so React Query
 * re-fetches the REST inbox (signal-only design — the stream carries no notification data).
 * Reconnects with a fresh short-lived stream token on drop; closes on logout/unmount.
 * Renders nothing.
 */
export function NotificationStreamListener(): null {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session) return;

    let source: EventSource | null = null;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const reconcile = () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    };

    const open = async () => {
      if (stopped) return;
      try {
        const { token } = await fetchNotificationStreamToken();
        if (stopped) return;
        const url = `${API_BASE_URL}/me/notifications/stream?token=${encodeURIComponent(token)}`;
        source = new EventSource(url);
        source.addEventListener('ready', reconcile); // reconcile on (re)connect
        source.addEventListener('notification', reconcile);
        source.onerror = () => {
          source?.close();
          source = null;
          if (!stopped) {
            // Re-mint a fresh stream token (the previous one is short-lived) and reopen.
            retry = setTimeout(() => void open(), 3000);
          }
        };
      } catch {
        if (!stopped) retry = setTimeout(() => void open(), 5000);
      }
    };

    void open();

    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      source?.close();
    };
  }, [session, queryClient]);

  return null;
}
