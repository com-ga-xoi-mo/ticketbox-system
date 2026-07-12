import { z } from 'zod';
import { IssuedTicketSummarySchema } from '../ordering/order.contract';

export const TicketTransferStatusEnum = z.enum([
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'CANCELLED',
  'EXPIRED',
]);

export const InitiateTransferRequestSchema = z.object({
  recipientEmail: z.string().email(),
});

export const TransferSummaryResponseSchema = z.object({
  transferId: z.string().uuid(),
  recipientEmail: z.string().email(),
  expiresAt: z.string().datetime(),
  status: TicketTransferStatusEnum,
});

export const TransferDetailResponseSchema = TransferSummaryResponseSchema.extend({
  ticket: IssuedTicketSummarySchema,
  senderName: z.string(),
});
