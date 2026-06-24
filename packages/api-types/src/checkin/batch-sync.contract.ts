import { z } from 'zod';

import {
  InvalidScanReasonCodeSchema,
  UnassignedScanReasonCodeSchema,
} from './online-scan.contract';
import { TicketCacheDeltaResponseSchema } from './ticket-cache.contract';

const LocalIdSchema = z.string().trim().min(1).max(160);

export const BatchSyncEventSchema = z
  .object({
    localId: LocalIdSchema,
    assignmentId: z.string().uuid(),
    concertId: z.string().uuid(),
    gate: z.string().trim().min(1).max(120).optional(),
    qrPayloadHash: z.string().regex(/^[0-9a-f]{64}$/),
    scannedAt: z.string().datetime({ offset: true }),
    deviceId: z.string().trim().min(1).max(160),
  })
  .strict();
export type BatchSyncEvent = z.infer<typeof BatchSyncEventSchema>;

const BatchSyncEventsSchema = z
  .array(BatchSyncEventSchema)
  .max(100)
  .superRefine((events, context) => {
    const localIds = new Set<string>();
    events.forEach((event, index) => {
      if (localIds.has(event.localId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'localId values must be unique within a batch',
          path: [index, 'localId'],
        });
      }
      localIds.add(event.localId);
    });
  });

export const BatchSyncRequestSchema = z
  .object({
    concertId: z.string().uuid().optional(),
    events: BatchSyncEventsSchema,
    since: z.string().datetime({ offset: true }).optional(),
  })
  .strict();
export type BatchSyncRequest = z.infer<typeof BatchSyncRequestSchema>;

const resultBase = {
  localId: LocalIdSchema,
  message: z.string(),
};

const acceptedSchema = z
  .object({
    ...resultBase,
    status: z.literal('accepted'),
    ticketId: z.string().uuid(),
    checkedInAt: z.string().datetime({ offset: true }),
  })
  .strict();

const duplicateSchema = z
  .object({
    ...resultBase,
    status: z.literal('duplicate'),
  })
  .strict();

const invalidSchema = z
  .object({
    ...resultBase,
    status: z.literal('invalid'),
    reasonCode: InvalidScanReasonCodeSchema,
  })
  .strict();

const conflictSchema = z
  .object({
    ...resultBase,
    status: z.literal('conflict'),
    conflictReason: z.string(),
  })
  .strict();

const unassignedSchema = z
  .object({
    ...resultBase,
    status: z.literal('unassigned'),
    reasonCode: UnassignedScanReasonCodeSchema,
  })
  .strict();

export const BatchSyncEventResultSchema = z.discriminatedUnion('status', [
  acceptedSchema,
  duplicateSchema,
  invalidSchema,
  conflictSchema,
  unassignedSchema,
]);
export type BatchSyncEventResult = z.infer<typeof BatchSyncEventResultSchema>;

export const BatchSyncResponseSchema = z
  .object({
    results: z.array(BatchSyncEventResultSchema),
    cacheUpdates: TicketCacheDeltaResponseSchema.optional(),
  })
  .strict();
export type BatchSyncResponse = z.infer<typeof BatchSyncResponseSchema>;
