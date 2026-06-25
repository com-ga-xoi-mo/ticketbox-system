import { z } from 'zod';

export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'EXPIRED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
] as const;

export const OrderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderItemSummarySchema = z.object({
  id: z.string(),
  ticketTypeId: z.string(),
  ticketTypeName: z.string().optional(),
  quantity: z.number().int().min(1),
  unitPriceVnd: z.number().int().min(0),
  totalPriceVnd: z.number().int().min(0),
});
export type OrderItemSummary = z.infer<typeof OrderItemSummarySchema>;

export const OrderSummaryResponseSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  userId: z.string(),
  concertId: z.string(),
  idempotencyKey: z.string().nullable().optional(),
  status: OrderStatusSchema,
  totalAmountVnd: z.number().int().min(0),
  reservationExpiresAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(OrderItemSummarySchema),
});
export type OrderSummaryResponse = z.infer<typeof OrderSummaryResponseSchema>;

export const OrderDetailResponseSchema = OrderSummaryResponseSchema.extend({
  paidAt: z.string().nullable().optional(),
  expiredAt: z.string().nullable().optional(),
  cancelledAt: z.string().nullable().optional(),
});
export type OrderDetailResponse = z.infer<typeof OrderDetailResponseSchema>;

export const OrderListResponseSchema = z.array(OrderSummaryResponseSchema);
export type OrderListResponse = z.infer<typeof OrderListResponseSchema>;

export const OrderItemSchema = OrderItemSummarySchema;
export type OrderItem = OrderItemSummary;

export const OrderSchema = OrderDetailResponseSchema;
export type Order = OrderDetailResponse;

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
  id: z.string(),
  orderId: z.string(),
  ticketTypeId: z.string(),
  ticketTypeName: z.string().optional(),
  status: z.string(),
  createdAt: z.union([z.string(), z.date()]),
});
export type IssuedTicketSummary = z.infer<typeof IssuedTicketSummarySchema>;

export const IssuedTicketDetailSchema = IssuedTicketSummarySchema.extend({
  qrToken: z.string(),
  concertTitle: z.string().optional(),
  concertStartsAt: z.union([z.string(), z.date()]).optional(),
  venueName: z.string().optional(),
});
export type IssuedTicketDetail = z.infer<typeof IssuedTicketDetailSchema>;
