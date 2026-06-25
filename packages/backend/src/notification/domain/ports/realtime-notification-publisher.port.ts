export const REALTIME_NOTIFICATION_PUBLISHER = Symbol('REALTIME_NOTIFICATION_PUBLISHER');

/**
 * Transport-agnostic publisher of realtime "you have a new notification" signals for a
 * specific user. Implemented over Redis pub/sub today; a WebSocket adapter could implement
 * the same port later without changing notification use-cases.
 */
export interface RealtimeNotificationPublisherPort {
  publishNewNotification(userId: string): Promise<void>;
}
