import type { NotificationRecord } from '../../domain/notification.types';

export function serializeAudienceNotification(notification: NotificationRecord) {
  return {
    id: notification.id,
    type: notification.type,
    subject: notification.subject,
    body: notification.body,
    actionUrl: notification.actionUrl,
    resourceType: notification.resourceType,
    resourceId: notification.resourceId,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: (notification.createdAt ?? notification.sentAt ?? new Date()).toISOString(),
    sentAt: notification.sentAt?.toISOString() ?? null,
  };
}
