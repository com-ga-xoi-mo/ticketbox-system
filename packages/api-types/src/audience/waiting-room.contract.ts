import { z } from 'zod';

export const WaitingRoomManualOverrideSchema = z.enum([
  'NONE',
  'FORCE_ON',
  'FORCE_OFF',
]);
export type WaitingRoomManualOverride = z.infer<
  typeof WaitingRoomManualOverrideSchema
>;

export const WaitingRoomStatusSchema = z.enum([
  'INACTIVE',
  'WAITING',
  'ADMITTED',
  'LEFT',
]);
export type WaitingRoomStatus = z.infer<typeof WaitingRoomStatusSchema>;

export const WaitingRoomStatusResponseSchema = z.object({
  concertId: z.string().uuid(),
  userId: z.string().uuid(),
  active: z.boolean(),
  status: WaitingRoomStatusSchema,
  position: z.number().int().min(0).nullable(),
  admissionToken: z.string().nullable(),
  admissionExpiresAt: z.string().nullable(),
});
export type WaitingRoomStatusResponse = z.infer<
  typeof WaitingRoomStatusResponseSchema
>;

export const WaitingRoomStreamTokenResponseSchema = z.object({
  token: z.string().min(1),
});
export type WaitingRoomStreamTokenResponse = z.infer<
  typeof WaitingRoomStreamTokenResponseSchema
>;

export const WaitingRoomSseEventSchema = WaitingRoomStatusResponseSchema.extend({
  type: z.enum(['status', 'ping', 'ready']).optional(),
});
export type WaitingRoomSseEvent = z.infer<typeof WaitingRoomSseEventSchema>;

export const ConfigureWaitingRoomRequestSchema = z.object({
  enabled: z.boolean(),
  autoActivate: z.boolean(),
  manualOverride: WaitingRoomManualOverrideSchema.default('NONE'),
  maxConcurrency: z.number().int().min(1),
  admissionTtlSeconds: z.number().int().min(1),
  activateThreshold: z.number().int().min(1),
  deactivateThreshold: z.number().int().min(0),
  cooldownSeconds: z.number().int().min(0),
});
export type ConfigureWaitingRoomRequest = z.infer<
  typeof ConfigureWaitingRoomRequestSchema
>;

export const WaitingRoomConfigResponseSchema =
  ConfigureWaitingRoomRequestSchema.extend({
    id: z.string().uuid(),
    concertId: z.string().uuid(),
    createdAt: z.string(),
    updatedAt: z.string(),
  });
export type WaitingRoomConfigResponse = z.infer<
  typeof WaitingRoomConfigResponseSchema
>;

export const SetWaitingRoomOverrideRequestSchema = z.object({
  manualOverride: WaitingRoomManualOverrideSchema,
});
export type SetWaitingRoomOverrideRequest = z.infer<
  typeof SetWaitingRoomOverrideRequestSchema
>;
