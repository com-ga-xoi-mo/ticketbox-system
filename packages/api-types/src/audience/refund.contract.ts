import { z } from 'zod';

export const RefundRequestStatusSchema = z.enum([
  'REQUESTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);
export type RefundRequestStatus = z.infer<typeof RefundRequestStatusSchema>;

export const RefundRequestReasonSchema = z.enum([
  'CANNOT_ATTEND',
  'EVENT_CHANGED',
  'DUPLICATE_PURCHASE',
  'PAYMENT_ISSUE',
  'OTHER',
]);
export type RefundRequestReason = z.infer<typeof RefundRequestReasonSchema>;

export const RefundEligibilityResponseSchema = z
  .object({
    eligible: z.boolean(),
    reasonCode: z
      .enum([
        'ELIGIBLE',
        'ORDER_NOT_PAID',
        'ORDER_FINALIZED',
        'TICKET_NOT_REFUNDABLE',
        'DUPLICATE_ACTIVE_REQUEST',
        'NOT_FOUND',
      ])
      .optional(),
    message: z.string(),
    orderId: z.string().nullable().optional(),
    ticketId: z.string().nullable().optional(),
    refundableAmountVnd: z.number().int().min(0).nullable().optional(),
    refundableTicketCount: z.number().int().min(0).nullable().optional(),
    existingRequestId: z.string().nullable().optional(),
  })
  .strict();
export type RefundEligibilityResponse = z.infer<typeof RefundEligibilityResponseSchema>;

export const RefundRequestStatusHistoryItemSchema = z
  .object({
    id: z.string(),
    status: RefundRequestStatusSchema,
    note: z.string().nullable().optional(),
    createdAt: z.string(),
  })
  .strict();
export type RefundRequestStatusHistoryItem = z.infer<
  typeof RefundRequestStatusHistoryItemSchema
>;

export const RefundRequestResponseSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    orderId: z.string(),
    ticketId: z.string().nullable().optional(),
    status: RefundRequestStatusSchema,
    reason: RefundRequestReasonSchema,
    message: z.string().nullable().optional(),
    requestedAmountVnd: z.number().int().min(0).nullable().optional(),
    requestedTicketCount: z.number().int().min(0).nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    statusHistory: z.array(RefundRequestStatusHistoryItemSchema),
  })
  .strict();
export type RefundRequestResponse = z.infer<typeof RefundRequestResponseSchema>;

export const RefundRequestListResponseSchema = z.array(RefundRequestResponseSchema);
export type RefundRequestListResponse = z.infer<typeof RefundRequestListResponseSchema>;

export const CreateRefundRequestSchema = z
  .object({
    orderId: z.string().uuid().optional(),
    ticketId: z.string().uuid().optional(),
    reason: RefundRequestReasonSchema,
    message: z.string().trim().min(10).max(4000).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.orderId || value.ticketId), {
    message: 'orderId or ticketId is required',
    path: ['orderId'],
  })
  .refine((value) => !(value.orderId && value.ticketId), {
    message: 'Only one of orderId or ticketId can be provided',
    path: ['ticketId'],
  });
export type CreateRefundRequest = z.infer<typeof CreateRefundRequestSchema>;
