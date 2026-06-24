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
  quantity: z.number().int().positive(),
  unitPriceVnd: z.number().int().positive(),
  totalPriceVnd: z.number().int().positive(),
}).strict();
export type OrderItemSummary = z.infer<typeof OrderItemSummarySchema>;

export const OrderSummaryResponseSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  userId: z.string(),
  concertId: z.string(),
  idempotencyKey: z.string(),
  status: OrderStatusSchema,
  totalAmountVnd: z.number().int().min(0),
  reservationExpiresAt: z.union([z.string().datetime(), z.date()]).nullable(),
  createdAt: z.union([z.string().datetime(), z.date()]),
  updatedAt: z.union([z.string().datetime(), z.date()]),
  items: z.array(OrderItemSummarySchema),
});
export type OrderSummaryResponse = z.infer<typeof OrderSummaryResponseSchema>;

export const OrderDetailResponseSchema = OrderSummaryResponseSchema.extend({
  paidAt: z.union([z.string().datetime(), z.date()]).nullable(),
  expiredAt: z.union([z.string().datetime(), z.date()]).nullable(),
  cancelledAt: z.union([z.string().datetime(), z.date()]).nullable(),
});
export type OrderDetailResponse = z.infer<typeof OrderDetailResponseSchema>;

export const OrderListResponseSchema = z.array(OrderSummaryResponseSchema);
export type OrderListResponse = z.infer<typeof OrderListResponseSchema>;
