import { z } from 'zod';

export const WaitlistEntryStatusSchema = z.enum([
  'WAITING',
  'GRANTED',
  'FULFILLED',
  'CANCELLED',
  'EXPIRED',
]);
export type WaitlistEntryStatus = z.infer<typeof WaitlistEntryStatusSchema>;

export const PurchaseEntitlementStatusSchema = z.enum([
  'ACTIVE',
  'CONSUMED',
  'EXPIRED',
  'REVOKED',
]);
export type PurchaseEntitlementStatus = z.infer<typeof PurchaseEntitlementStatusSchema>;

export const JoinWaitlistRequestSchema = z.object({
  concertId: z.string().uuid(),
  ticketTypeId: z.string().uuid(),
  desiredQuantity: z.number().int().min(1),
});
export type JoinWaitlistRequest = z.infer<typeof JoinWaitlistRequestSchema>;

export const WaitlistEntitlementSchema = z.object({
  id: z.string().uuid(),
  status: PurchaseEntitlementStatusSchema,
  quantity: z.number().int().min(1),
  expiresAt: z.string(),
  grantedAt: z.string(),
});
export type WaitlistEntitlement = z.infer<typeof WaitlistEntitlementSchema>;

export const WaitlistStatusResponseSchema = z.object({
  entryId: z.string().uuid().nullable(),
  concertId: z.string().uuid(),
  ticketTypeId: z.string().uuid(),
  status: WaitlistEntryStatusSchema.nullable(),
  desiredQuantity: z.number().int().min(1).nullable(),
  queuePosition: z.number().int().min(1).nullable(),
  joinedAt: z.string().nullable(),
  entitlement: WaitlistEntitlementSchema.nullable(),
});
export type WaitlistStatusResponse = z.infer<typeof WaitlistStatusResponseSchema>;

export const LeaveWaitlistResponseSchema = z.object({
  entryId: z.string().uuid().nullable(),
  revokedEntitlementId: z.string().uuid().nullable(),
  status: WaitlistEntryStatusSchema.nullable(),
});
export type LeaveWaitlistResponse = z.infer<typeof LeaveWaitlistResponseSchema>;
