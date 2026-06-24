import { z } from 'zod';

export const TICKET_STATUSES = ['ISSUED', 'CHECKED_IN', 'VOIDED', 'REFUNDED'] as const;

export const TicketStatusSchema = z.enum(TICKET_STATUSES);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const TicketSummaryResponseSchema = z.object({
  id: z.string(),
  ticketNumber: z.string(),
  orderId: z.string(),
  orderNumber: z.string(),
  userId: z.string(),
  concertId: z.string(),
  concertTitle: z.string(),
  concertStartsAt: z.union([z.string(), z.date()]),
  ticketTypeId: z.string(),
  ticketTypeName: z.string(),
  ticketTypeCode: z.string(),
  status: TicketStatusSchema,
  issuedAt: z.union([z.string(), z.date()]),
  checkedInAt: z.union([z.string(), z.date()]).nullable().optional(),
});
export type TicketSummaryResponse = z.infer<typeof TicketSummaryResponseSchema>;

export const TicketDetailResponseSchema = TicketSummaryResponseSchema.extend({
  qrPayload: z.string().nullable().optional(),
});
export type TicketDetailResponse = z.infer<typeof TicketDetailResponseSchema>;

export const TicketListResponseSchema = z.array(TicketSummaryResponseSchema);
export type TicketListResponse = z.infer<typeof TicketListResponseSchema>;
