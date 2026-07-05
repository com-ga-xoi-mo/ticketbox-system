import { describe, expect, it } from 'vitest';

import {
  NOTIFICATION_CHANNEL_PATTERN,
  NOTIFICATION_SIGNAL,
  userIdFromChannel,
  userNotificationChannel,
} from './realtime-notification';

describe('realtime notification helpers', () => {
  it('builds a per-user channel name', () => {
    expect(userNotificationChannel('user-1')).toBe('notif:user:user-1');
  });

  it('round-trips channel ↔ userId', () => {
    const channel = userNotificationChannel('abc-123');
    expect(userIdFromChannel(channel)).toBe('abc-123');
  });

  it('returns null for a non-matching channel', () => {
    expect(userIdFromChannel('other:thing')).toBeNull();
    expect(userIdFromChannel('notif:user:')).toBeNull();
  });

  it('pattern matches the per-user prefix', () => {
    expect(NOTIFICATION_CHANNEL_PATTERN).toBe('notif:user:*');
    expect(userNotificationChannel('x').startsWith('notif:user:')).toBe(true);
  });

  it('signal is a lightweight type marker, not the notification', () => {
    expect(NOTIFICATION_SIGNAL).toEqual({ type: 'notification' });
  });
});
