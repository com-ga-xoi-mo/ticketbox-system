import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NotificationCenterPage } from './NotificationCenterPage';

vi.mock('../../shared/auth/AudienceProtectedRoute', () => ({
  AudienceProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../shared/api/notifications', () => ({
  useAudienceNotifications: () => ({
    isLoading: false,
    data: [
      {
        id: 'notification-1',
        type: 'SUPPORT_UPDATE',
        subject: 'Yêu cầu hỗ trợ đã tiếp nhận',
        body: 'Đội hỗ trợ đã nhận yêu cầu của bạn.',
        resourceType: 'SUPPORT_REQUEST',
        resourceId: 'support-1',
        actionUrl: null,
        readAt: null,
        createdAt: '2026-06-25T05:00:00.000Z',
      },
    ],
  }),
  useMarkAllAudienceNotificationsRead: () => ({ mutate: vi.fn(), isPending: false }),
  useMarkAudienceNotificationRead: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('NotificationCenterPage', () => {
  it('renders notification categories, unread action, and deep-link content', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/account/notifications']}>
        <NotificationCenterPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Trung tâm thông báo');
    expect(html).toContain('Chưa đọc');
    expect(html).toContain('Yêu cầu hỗ trợ đã tiếp nhận');
    expect(html).toContain('Đã đọc');
  });
});
