import { z } from 'zod';

export const PromoErrorCodeSchema = z.enum([
  'PROMO_CODE_NOT_FOUND',
  'PROMO_CODE_INACTIVE',
  'PROMO_CODE_EXPIRED',
  'PROMO_CODE_NOT_YET_VALID',
  'PROMO_USAGE_LIMIT_EXCEEDED',
  'PROMO_USER_LIMIT_EXCEEDED',
  'PROMO_NOT_APPLICABLE',
]);
export type PromoErrorCode = z.infer<typeof PromoErrorCodeSchema>;

export const DiscountTypeSchema = z.enum(['PERCENTAGE', 'FIXED_AMOUNT']);
export type DiscountType = z.infer<typeof DiscountTypeSchema>;

export const ValidatePromoRequestSchema = z.object({
  code: z.string().trim().min(1),
  concertId: z.string().uuid(),
  ticketTypeIds: z.array(z.string().uuid()).min(1),
});
export type ValidatePromoRequest = z.infer<typeof ValidatePromoRequestSchema>;

export const ValidatePromoResponseSchema = z.discriminatedUnion('valid', [
  z.object({
    valid: z.literal(true),
    discountType: DiscountTypeSchema,
    discountValue: z.number().int(),
    maxDiscountVnd: z.number().int().nullable(),
    message: z.string().optional(),
  }),
  z.object({
    valid: z.literal(false),
    errorCode: PromoErrorCodeSchema,
    message: z.string(),
  }),
]);
export type ValidatePromoResponse = z.infer<typeof ValidatePromoResponseSchema>;
