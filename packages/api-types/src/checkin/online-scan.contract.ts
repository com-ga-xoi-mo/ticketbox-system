import { z } from 'zod';

export const INVALID_SCAN_REASON_CODES = [
  'INVALID_TICKET',
  'WRONG_CONCERT',
  'TICKET_NOT_ISSUED',
] as const;
export const UNASSIGNED_SCAN_REASON_CODES = ['REVOKED_ASSIGNMENT', 'ASSIGNMENT_MISMATCH'] as const;

export const InvalidScanReasonCodeSchema = z.enum(INVALID_SCAN_REASON_CODES);
export const UnassignedScanReasonCodeSchema = z.enum(UNASSIGNED_SCAN_REASON_CODES);
export type InvalidScanReasonCode = z.infer<typeof InvalidScanReasonCodeSchema>;
export type UnassignedScanReasonCode = z.infer<typeof UnassignedScanReasonCodeSchema>;

export const OnlineScanRequestSchema = z
  .object({
    assignmentId: z.string().uuid(),
    concertId: z.string().uuid(),
    gate: z.string().trim().min(1).optional(),
    qrPayload: z.string().min(1),
    scannedAt: z.string().datetime({ offset: true }),
    deviceId: z.string().trim().min(1).max(160),
  })
  .strict();
export type OnlineScanRequest = z.infer<typeof OnlineScanRequestSchema>;

const acceptedSchema = z
  .object({
    status: z.literal('accepted'),
    message: z.string(),
    ticketId: z.string().uuid(),
    checkedInAt: z.string().datetime({ offset: true }),
    checkinEventId: z.string().uuid().optional(),
  })
  .strict();

const duplicateSchema = z
  .object({
    status: z.literal('duplicate'),
    message: z.string(),
    ticketId: z.string().uuid().optional(),
    checkedInAt: z.string().datetime({ offset: true }).optional(),
    checkinEventId: z.string().uuid().optional(),
  })
  .strict();

const invalidSchema = z
  .object({
    status: z.literal('invalid'),
    message: z.string(),
    reasonCode: InvalidScanReasonCodeSchema,
    ticketId: z.string().uuid().optional(),
    checkinEventId: z.string().uuid().optional(),
  })
  .strict();

const unassignedSchema = z
  .object({
    status: z.literal('unassigned'),
    message: z.string(),
    reasonCode: UnassignedScanReasonCodeSchema,
    checkinEventId: z.string().uuid().optional(),
  })
  .strict();

export const OnlineScanResponseSchema = z.discriminatedUnion('status', [
  acceptedSchema,
  duplicateSchema,
  invalidSchema,
  unassignedSchema,
]);
export type OnlineScanResponse = z.infer<typeof OnlineScanResponseSchema>;
