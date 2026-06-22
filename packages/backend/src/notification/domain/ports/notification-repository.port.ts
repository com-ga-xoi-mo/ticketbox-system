import type {
  DeliveryAttemptRecord,
  NotificationAttemptStatus,
  NotificationChannel,
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
  recordDeliveryAttempt(input: RecordDeliveryAttemptInput): Promise<DeliveryAttemptRecord>;
  updateStatus(input: UpdateNotificationStatusInput): Promise<NotificationRecord>;
}
