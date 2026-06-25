import type { NotificationRepositoryPort } from '../../domain/ports/notification-repository.port';
import type { NotificationRecord } from '../../domain/notification.types';

export class ListAudienceNotificationsUseCase {
  constructor(private readonly notificationRepository: NotificationRepositoryPort) {}

  execute(input: {
    userId: string;
    unreadOnly?: boolean;
    type?: string;
  }): Promise<NotificationRecord[]> {
    if (!this.notificationRepository.listInbox) {
      throw new Error('Notification inbox repository is not configured');
    }
    return this.notificationRepository.listInbox(input);
  }
}

export class GetAudienceUnreadNotificationCountUseCase {
  constructor(private readonly notificationRepository: NotificationRepositoryPort) {}

  async execute(userId: string): Promise<{ unreadCount: number }> {
    if (!this.notificationRepository.countUnread) {
      throw new Error('Notification inbox repository is not configured');
    }
    return { unreadCount: await this.notificationRepository.countUnread(userId) };
  }
}

export class MarkAudienceNotificationReadUseCase {
  constructor(private readonly notificationRepository: NotificationRepositoryPort) {}

  async execute(input: {
    userId: string;
    notificationId: string;
  }): Promise<NotificationRecord | null> {
    if (!this.notificationRepository.markRead) {
      throw new Error('Notification inbox repository is not configured');
    }
    return this.notificationRepository.markRead({
      ...input,
      readAt: new Date(),
    });
  }
}

export class MarkAllAudienceNotificationsReadUseCase {
  constructor(private readonly notificationRepository: NotificationRepositoryPort) {}

  async execute(userId: string): Promise<{ updatedCount: number; readAt: Date }> {
    const readAt = new Date();
    if (!this.notificationRepository.markAllRead) {
      throw new Error('Notification inbox repository is not configured');
    }
    const updatedCount = await this.notificationRepository.markAllRead({ userId, readAt });
    return { updatedCount, readAt };
  }
}
