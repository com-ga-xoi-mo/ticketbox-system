import { z } from 'zod';

export const SupportRequestStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
]);
export type SupportRequestStatus = z.infer<typeof SupportRequestStatusSchema>;

export const SupportRequestCategorySchema = z.enum([
  'ORDER_HELP',
  'TICKET_HELP',
  'PAYMENT_HELP',
  'REFUND_HELP',
  'ACCOUNT_HELP',
  'OTHER',
]);
export type SupportRequestCategory = z.infer<typeof SupportRequestCategorySchema>;

export const SupportRequestStatusHistoryItemSchema = z
  .object({
    id: z.string(),
    status: SupportRequestStatusSchema,
    note: z.string().nullable().optional(),
    createdAt: z.string(),
  })
  .strict();
export type SupportRequestStatusHistoryItem = z.infer<
  typeof SupportRequestStatusHistoryItemSchema
>;

export const SupportRequestResponseSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    orderId: z.string().nullable().optional(),
    ticketId: z.string().nullable().optional(),
    category: SupportRequestCategorySchema,
    status: SupportRequestStatusSchema,
    subject: z.string(),
    message: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    statusHistory: z.array(SupportRequestStatusHistoryItemSchema),
  })
  .strict();
export type SupportRequestResponse = z.infer<typeof SupportRequestResponseSchema>;

export const SupportRequestListResponseSchema = z.array(SupportRequestResponseSchema);
export type SupportRequestListResponse = z.infer<typeof SupportRequestListResponseSchema>;

export const CreateSupportRequestSchema = z
  .object({
    orderId: z.string().uuid().optional(),
    ticketId: z.string().uuid().optional(),
    category: SupportRequestCategorySchema,
    subject: z.string().trim().min(3).max(180),
    message: z.string().trim().min(10).max(4000),
  })
  .strict()
  .refine((value) => !(value.orderId && value.ticketId), {
    message: 'Only one of orderId or ticketId can be provided',
    path: ['ticketId'],
  });
export type CreateSupportRequest = z.infer<typeof CreateSupportRequestSchema>;
