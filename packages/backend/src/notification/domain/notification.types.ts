export enum NotificationChannel {
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum NotificationAttemptStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export enum NotificationType {
  GENERAL = 'GENERAL',
  PURCHASE_CONFIRMATION = 'PURCHASE_CONFIRMATION',
  CONCERT_REMINDER = 'CONCERT_REMINDER',
}

export interface NotificationRecord {
  id: string;
  userId: string;
  concertId: string | null;
  channel: NotificationChannel;
  type: NotificationType | string;
  dedupeKey: string;
  status: NotificationStatus;
  subject: string | null;
  body: string;
  scheduledAt: Date | null;
  sentAt: Date | null;
  failedAttemptCount: number;
}

export interface DeliveryAttemptRecord {
  id: string;
  notificationId: string;
  status: NotificationAttemptStatus;
  provider: string | null;
  providerMessageId: string | null;
  errorMessage: string | null;
  attemptedAt: Date;
}

export interface DeliveryRequest {
  notificationId: string;
  channel: NotificationChannel;
  toUserId: string;
  toEmail?: string;
  subject: string;
  body: string;
}

export interface DeliveryResult {
  provider: string;
  providerMessageId?: string;
}

export interface DeliveryOutcome {
  notificationId: string;
  status: NotificationStatus;
  attempt?: DeliveryAttemptRecord;
  shouldRetry: boolean;
  skippedReason?: string;
}
