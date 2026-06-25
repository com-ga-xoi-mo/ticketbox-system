import { describe, expect, it, vi } from 'vitest';
import {
  fetchAudienceNotificationUnreadCount,
  fetchAudienceNotifications,
  markAllAudienceNotificationsRead,
  markAudienceNotificationRead,
} from './notifications';
import { apiGet, apiPost } from './client';

vi.mock('./client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

describe('notification API', () => {
  it('fetches notifications, unread count, and read mutations', async () => {
    const timestamp = '2026-06-25T05:00:00.000Z';
    vi.mocked(apiGet)
      .mockResolvedValueOnce([
        {
          id: 'notification-1',
          type: 'SUPPORT_UPDATE',
          subject: 'Support update',
          body: 'Request opened',
          actionUrl: '/account/support/requests/support-1',
          resourceType: 'SUPPORT_REQUEST',
          resourceId: 'support-1',
          readAt: null,
          createdAt: timestamp,
          sentAt: timestamp,
        },
      ])
      .mockResolvedValueOnce({ unreadCount: 1 });
    vi.mocked(apiPost)
      .mockResolvedValueOnce({ id: 'notification-1', readAt: timestamp })
      .mockResolvedValueOnce({ updatedCount: 1, readAt: timestamp });

    await expect(fetchAudienceNotifications({ unreadOnly: true, type: 'SUPPORT_UPDATE' })).resolves.toHaveLength(1);
    expect(apiGet).toHaveBeenCalledWith('/me/notifications?unreadOnly=true&type=SUPPORT_UPDATE');

    await expect(fetchAudienceNotificationUnreadCount()).resolves.toMatchObject({ unreadCount: 1 });
    await expect(markAudienceNotificationRead('notification-1')).resolves.toMatchObject({
      id: 'notification-1',
    });
    expect(apiPost).toHaveBeenCalledWith('/me/notifications/notification-1/read', {});

    await expect(markAllAudienceNotificationsRead()).resolves.toMatchObject({ updatedCount: 1 });
    expect(apiPost).toHaveBeenCalledWith('/me/notifications/read-all', {});
  });
});
