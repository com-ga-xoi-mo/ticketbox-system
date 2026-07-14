import { z } from 'zod';

export const LotteryConfigStatusSchema = z.enum([
  'SCHEDULED',
  'DRAWING',
  'COMPLETED',
  'CANCELLED',
]);
export type LotteryConfigStatus = z.infer<typeof LotteryConfigStatusSchema>;

export const LotteryRegistrationStatusSchema = z.enum([
  'REGISTERED',
  'WON',
  'NOT_SELECTED',
  'WITHDRAWN',
]);
export type LotteryRegistrationStatus = z.infer<typeof LotteryRegistrationStatusSchema>;

export const RegisterForLotteryRequestSchema = z.object({
  ticketTypeId: z.string().uuid(),
  desiredQuantity: z.number().int().min(1),
});
export type RegisterForLotteryRequest = z.infer<typeof RegisterForLotteryRequestSchema>;

export const ConfigureLotteryRequestSchema = z.object({
  ticketTypeId: z.string().uuid(),
  registrationOpensAt: z.string().datetime(),
  registrationClosesAt: z.string().datetime(),
  drawAt: z.string().datetime(),
  publicSaleStartsAt: z.string().datetime(),
  allocation: z.number().int().min(1),
});
export type ConfigureLotteryRequest = z.infer<typeof ConfigureLotteryRequestSchema>;

export const LotteryStatusResponseSchema = z.object({
  ticketTypeId: z.string().uuid(),
  registrationId: z.string().uuid().nullable(),
  registrationStatus: LotteryRegistrationStatusSchema.nullable(),
  desiredQuantity: z.number().int().min(1).nullable(),
  wonQuantity: z.number().int().min(0).nullable(),
  purchasedQuantity: z.number().int().min(0).nullable(),
  remainingWonQuantity: z.number().int().min(0).nullable(),
  configStatus: LotteryConfigStatusSchema.nullable(),
  registrationOpensAt: z.string().nullable(),
  registrationClosesAt: z.string().nullable(),
  drawAt: z.string().nullable(),
});
export type LotteryStatusResponse = z.infer<typeof LotteryStatusResponseSchema>;

export const WithdrawLotteryResponseSchema = z.object({
  registrationId: z.string().uuid().nullable(),
  status: LotteryRegistrationStatusSchema.nullable(),
});
export type WithdrawLotteryResponse = z.infer<typeof WithdrawLotteryResponseSchema>;

export const ConfigureLotteryResponseSchema = z.object({
  ticketTypeId: z.string().uuid(),
  status: LotteryConfigStatusSchema,
  registrationOpensAt: z.string(),
  registrationClosesAt: z.string(),
  drawAt: z.string(),
  allocation: z.number().int().min(1),
});
export type ConfigureLotteryResponse = z.infer<typeof ConfigureLotteryResponseSchema>;

export const RunLotteryDrawNowResponseSchema = z.object({
  ticketTypeId: z.string().uuid(),
  granted: z.number().int().min(0),
  notSelected: z.number().int().min(0),
});
export type RunLotteryDrawNowResponse = z.infer<typeof RunLotteryDrawNowResponseSchema>;

export const LotteryRegistrationListItemSchema = z.object({
  registrationId: z.string().uuid(),
  userId: z.string().uuid(),
  userEmail: z.string().email(),
  userDisplayName: z.string(),
  desiredQuantity: z.number().int().min(1),
  wonQuantity: z.number().int().min(0),
  purchasedQuantity: z.number().int().min(0),
  remainingWonQuantity: z.number().int().min(0),
  status: LotteryRegistrationStatusSchema,
  registeredAt: z.string(),
  wonAt: z.string().nullable(),
  notSelectedAt: z.string().nullable(),
  withdrawnAt: z.string().nullable(),
  fulfilledAt: z.string().nullable(),
});
export type LotteryRegistrationListItem = z.infer<
  typeof LotteryRegistrationListItemSchema
>;

export const LotteryRegistrationListResponseSchema = z.object({
  ticketTypeId: z.string().uuid(),
  registrations: z.array(LotteryRegistrationListItemSchema),
});
export type LotteryRegistrationListResponse = z.infer<
  typeof LotteryRegistrationListResponseSchema
>;
