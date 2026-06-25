import { z } from 'zod';

export const AudienceNotificationTypeSchema = z.enum([
  'GENERAL',
  'PURCHASE_CONFIRMATION',
  'CONCERT_REMINDER',
  'PAYMENT_FAILED',
  'SUPPORT_UPDATE',
  'REFUND_UPDATE',
  'TICKET_UPDATE',
  'TICKET_RESEND',
]);
export type AudienceNotificationType = z.infer<typeof AudienceNotificationTypeSchema>;

export const AudienceNotificationResourceTypeSchema = z.enum([
  'ORDER',
  'TICKET',
  'SUPPORT_REQUEST',
  'REFUND_REQUEST',
  'CONCERT',
]);
export type AudienceNotificationResourceType = z.infer<
  typeof AudienceNotificationResourceTypeSchema
>;

export const AudienceNotificationItemSchema = z
  .object({
    id: z.string(),
    type: AudienceNotificationTypeSchema.or(z.string().min(1).max(80)),
    subject: z.string().nullable().optional(),
    body: z.string(),
    actionUrl: z.string().nullable().optional(),
    resourceType: AudienceNotificationResourceTypeSchema.nullable().optional(),
    resourceId: z.string().nullable().optional(),
    readAt: z.string().nullable().optional(),
    createdAt: z.string(),
    sentAt: z.string().nullable().optional(),
  })
  .strict();
export type AudienceNotificationItem = z.infer<typeof AudienceNotificationItemSchema>;

export const AudienceNotificationListResponseSchema = z.array(
  AudienceNotificationItemSchema,
);
export type AudienceNotificationListResponse = z.infer<
  typeof AudienceNotificationListResponseSchema
>;

export const AudienceNotificationUnreadCountResponseSchema = z
  .object({
    unreadCount: z.number().int().min(0),
  })
  .strict();
export type AudienceNotificationUnreadCountResponse = z.infer<
  typeof AudienceNotificationUnreadCountResponseSchema
>;

export const AudienceNotificationMarkReadResponseSchema = z
  .object({
    id: z.string(),
    readAt: z.string(),
  })
  .strict();
export type AudienceNotificationMarkReadResponse = z.infer<
  typeof AudienceNotificationMarkReadResponseSchema
>;

export const AudienceNotificationMarkAllReadResponseSchema = z
  .object({
    updatedCount: z.number().int().min(0),
    readAt: z.string(),
  })
  .strict();
export type AudienceNotificationMarkAllReadResponse = z.infer<
  typeof AudienceNotificationMarkAllReadResponseSchema
>;
