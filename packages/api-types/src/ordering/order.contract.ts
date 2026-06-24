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
  reservationExpiresAt: z.union([z.string(), z.date()]).nullable().optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  items: z.array(OrderItemSummarySchema),
});
export type OrderSummaryResponse = z.infer<typeof OrderSummaryResponseSchema>;

export const OrderDetailResponseSchema = OrderSummaryResponseSchema.extend({
  paidAt: z.union([z.string(), z.date()]).nullable().optional(),
  expiredAt: z.union([z.string(), z.date()]).nullable().optional(),
  cancelledAt: z.union([z.string(), z.date()]).nullable().optional(),
});
export type OrderDetailResponse = z.infer<typeof OrderDetailResponseSchema>;

export const OrderListResponseSchema = z.array(OrderSummaryResponseSchema);
export type OrderListResponse = z.infer<typeof OrderListResponseSchema>;
