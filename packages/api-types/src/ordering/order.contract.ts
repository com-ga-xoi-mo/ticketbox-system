import { z } from 'zod';

export const OrderStatusSchema = z.enum([
  'PENDING_PAYMENT',
  'PAID',
  'EXPIRED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  ticketTypeId: z.string().uuid(),
  ticketTypeName: z.string(),
  quantity: z.number().int().min(1),
  unitPriceVnd: z.number().int().min(0),
  totalPriceVnd: z.number().int().min(0),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  userId: z.string().uuid(),
  concertId: z.string().uuid(),
  idempotencyKey: z.string().nullable(),
  status: OrderStatusSchema,
  totalAmountVnd: z.number().int().min(0),
  reservationExpiresAt: z.string().nullable(),
  paidAt: z.string().nullable(),
  expiredAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(OrderItemSchema),
});
export type Order = z.infer<typeof OrderSchema>;

export const CreateOrderItemRequestSchema = z.object({
  ticketTypeId: z.string().uuid(),
  quantity: z.number().int().min(1),
});
export type CreateOrderItemRequest = z.infer<typeof CreateOrderItemRequestSchema>;

export const CreateOrderRequestSchema = z.object({
  concertId: z.string().uuid(),
  idempotencyKey: z.string().min(1).max(80),
  items: z.array(CreateOrderItemRequestSchema).min(1),
});
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

export const PaymentProviderSchema = z.enum(['SIMULATOR', 'MOMO', 'VNPAY']);
export type PaymentProvider = z.infer<typeof PaymentProviderSchema>;

export const InitiatePaymentRequestSchema = z.object({
  idempotencyKey: z.string().min(1).max(180),
  provider: PaymentProviderSchema.optional(),
  returnUrl: z.string().optional(),
});
export type InitiatePaymentRequest = z.infer<typeof InitiatePaymentRequestSchema>;

export const PaymentInitiationResponseSchema = z.object({
  payment: z.object({
    id: z.string(),
    provider: z.string(),
  }),
  redirectUrl: z.string(),
  simulatorToken: z.string().nullable().optional(),
});
export type PaymentInitiationResponse = z.infer<typeof PaymentInitiationResponseSchema>;

export const IssuedTicketSummarySchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  ticketTypeId: z.string().uuid(),
  ticketTypeName: z.string().optional(),
  status: z.string(),
  createdAt: z.string(),
});
export type IssuedTicketSummary = z.infer<typeof IssuedTicketSummarySchema>;

export const IssuedTicketDetailSchema = IssuedTicketSummarySchema.extend({
  qrToken: z.string(),
  concertTitle: z.string().optional(),
  concertStartsAt: z.string().optional(),
  venueName: z.string().optional(),
});
export type IssuedTicketDetail = z.infer<typeof IssuedTicketDetailSchema>;
