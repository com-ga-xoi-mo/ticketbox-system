import { z } from 'zod';

export const TicketResendStatusSchema = z.enum(['QUEUED', 'SENT', 'COOLDOWN']);
export type TicketResendStatus = z.infer<typeof TicketResendStatusSchema>;

export const TicketResendResponseSchema = z
  .object({
    status: TicketResendStatusSchema,
    notificationId: z.string().nullable().optional(),
    cooldownUntil: z.string().nullable().optional(),
    message: z.string(),
  })
  .strict();
export type TicketResendResponse = z.infer<typeof TicketResendResponseSchema>;

const DownloadConcertSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    venueName: z.string(),
    startsAt: z.string(),
  })
  .strict();

const DownloadOrderSchema = z
  .object({
    id: z.string(),
    orderNumber: z.string(),
    status: z.string(),
    totalAmountVnd: z.number().int().min(0),
    paidAt: z.string().nullable().optional(),
    createdAt: z.string(),
  })
  .strict();

const DownloadTicketSchema = z
  .object({
    id: z.string(),
    ticketNumber: z.string(),
    status: z.string(),
    ticketTypeName: z.string(),
    ticketTypeCode: z.string(),
    issuedAt: z.string(),
    qrPayload: z.string().nullable().optional(),
  })
  .strict();

export const TicketDownloadResponseSchema = z
  .object({
    label: z.literal('Ticket'),
    ticket: DownloadTicketSchema,
    order: DownloadOrderSchema.pick({ id: true, orderNumber: true, status: true }),
    concert: DownloadConcertSchema,
    generatedAt: z.string(),
  })
  .strict();
export type TicketDownloadResponse = z.infer<typeof TicketDownloadResponseSchema>;

const ConfirmationLineItemSchema = z
  .object({
    ticketTypeId: z.string(),
    ticketTypeName: z.string().optional(),
    quantity: z.number().int().min(1),
    unitPriceVnd: z.number().int().min(0),
    totalPriceVnd: z.number().int().min(0),
  })
  .strict();

export const OrderConfirmationResponseSchema = z
  .object({
    label: z.literal('Purchase confirmation'),
    order: DownloadOrderSchema,
    concert: DownloadConcertSchema,
    lineItems: z.array(ConfirmationLineItemSchema),
    payment: z
      .object({
        provider: z.string().nullable().optional(),
        completedAt: z.string().nullable().optional(),
      })
      .strict(),
    generatedAt: z.string(),
  })
  .strict();
export type OrderConfirmationResponse = z.infer<typeof OrderConfirmationResponseSchema>;
