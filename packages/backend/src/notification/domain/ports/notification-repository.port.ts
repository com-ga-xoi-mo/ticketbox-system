import type {
  DeliveryAttemptRecord,
  NotificationAttemptStatus,
  NotificationChannel,
  NotificationResourceType,
  NotificationRecord,
  NotificationStatus,
} from '../notification.types';

export const NOTIFICATION_REPOSITORY = Symbol('NotificationRepositoryPort');

export interface UpsertNotificationInput {
  userId: string;
  concertId?: string | null;
  channel: NotificationChannel;
  type: string;
  dedupeKey: string;
  status: NotificationStatus;
  subject?: string | null;
  body: string;
  actionUrl?: string | null;
  resourceType?: NotificationResourceType | null;
  resourceId?: string | null;
  metadata?: unknown;
  readAt?: Date | null;
  scheduledAt?: Date | null;
  sentAt?: Date | null;
}

export interface RecordDeliveryAttemptInput {
  notificationId: string;
  status: NotificationAttemptStatus;
  provider?: string | null;
  providerMessageId?: string | null;
  errorMessage?: string | null;
}

export interface UpdateNotificationStatusInput {
  notificationId: string;
  status: NotificationStatus;
  sentAt?: Date | null;
}

export interface NotificationRepositoryPort {
  upsertByDedupeKey(input: UpsertNotificationInput): Promise<NotificationRecord>;
  findById(notificationId: string): Promise<NotificationRecord | null>;
  listInbox?(input: {
    userId: string;
    unreadOnly?: boolean;
    type?: string;
  }): Promise<NotificationRecord[]>;
  countUnread?(userId: string): Promise<number>;
  markRead?(input: {
    userId: string;
    notificationId: string;
    readAt: Date;
  }): Promise<NotificationRecord | null>;
  markAllRead?(input: { userId: string; readAt: Date }): Promise<number>;
  recordDeliveryAttempt(input: RecordDeliveryAttemptInput): Promise<DeliveryAttemptRecord>;
  updateStatus(input: UpdateNotificationStatusInput): Promise<NotificationRecord>;
}
