/**
 * Pure helpers for realtime in-app notification signalling. Transport-agnostic: these
 * define the per-user channel name and the lightweight signal payload, so the SSE/Redis
 * adapters (and any future WebSocket adapter) stay thin and testable.
 */

/** A new-notification signal carries no notification content — the client re-fetches REST. */
export interface NotificationSignal {
  readonly type: 'notification';
}

export const NOTIFICATION_SIGNAL: NotificationSignal = { type: 'notification' };

const CHANNEL_PREFIX = 'notif:user:';

/** Redis pub/sub channel for a specific user's realtime notification signals. */
export function userNotificationChannel(userId: string): string {
  return `${CHANNEL_PREFIX}${userId}`;
}

/** Pattern used by the API subscriber to receive every user's signals. */
export const NOTIFICATION_CHANNEL_PATTERN = `${CHANNEL_PREFIX}*`;

/** Extract the userId from a per-user channel name, or null if it does not match. */
export function userIdFromChannel(channel: string): string | null {
  if (!channel.startsWith(CHANNEL_PREFIX)) {
    return null;
  }
  const userId = channel.slice(CHANNEL_PREFIX.length);
  return userId.length > 0 ? userId : null;
}
