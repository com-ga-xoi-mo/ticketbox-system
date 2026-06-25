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
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  SUPPORT_UPDATE = 'SUPPORT_UPDATE',
  REFUND_UPDATE = 'REFUND_UPDATE',
  TICKET_UPDATE = 'TICKET_UPDATE',
  TICKET_RESEND = 'TICKET_RESEND',
}

export enum NotificationResourceType {
  ORDER = 'ORDER',
  TICKET = 'TICKET',
  SUPPORT_REQUEST = 'SUPPORT_REQUEST',
  REFUND_REQUEST = 'REFUND_REQUEST',
  CONCERT = 'CONCERT',
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
  actionUrl?: string | null;
  resourceType?: NotificationResourceType | string | null;
  resourceId?: string | null;
  metadata?: unknown;
  readAt?: Date | null;
  scheduledAt: Date | null;
  sentAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
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
  attachments?: DeliveryAttachment[];
}

export interface DeliveryAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
  contentId?: string;
}

export interface NotificationDeliveryContext {
  orderId?: string;
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
