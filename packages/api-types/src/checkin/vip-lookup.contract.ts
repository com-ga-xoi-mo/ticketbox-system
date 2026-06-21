import { z } from 'zod';

export const VipLookupTypeSchema = z.enum(['email', 'phone', 'external_ref']);
export const VipLookupRequestSchema = z
  .object({
    assignmentId: z.string().uuid(),
    concertId: z.string().uuid(),
    gate: z.string().trim().min(1).max(120).optional(),
    lookupType: VipLookupTypeSchema,
    value: z.string().trim().min(1).max(320),
  })
  .strict();

const guestSchema = z
  .object({
    id: z.string().uuid(),
    guestName: z.string().min(1).max(180),
    email: z.string().email().optional(),
    phone: z.string().max(40).optional(),
    externalRef: z.string().max(160).optional(),
  })
  .strict();

export const VipLookupResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('found'), guest: guestSchema }).strict(),
  z.object({ status: z.literal('not_found') }).strict(),
]);

export type VipLookupType = z.infer<typeof VipLookupTypeSchema>;
export type VipLookupRequest = z.infer<typeof VipLookupRequestSchema>;
export type VipLookupResponse = z.infer<typeof VipLookupResponseSchema>;
