import { z } from 'zod';

export const GUEST_LIST_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const GUEST_LIST_MAX_BASE64_LENGTH = Math.ceil(GUEST_LIST_MAX_FILE_BYTES / 3) * 4;

export const GuestListContentTypeSchema = z.enum([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
]);

const base64Schema = z
  .string()
  .min(4)
  .max(GUEST_LIST_MAX_BASE64_LENGTH)
  .refine(isCanonicalBase64, 'contentBase64 must be canonical Base64')
  .refine((value) => {
    const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
    return (value.length / 4) * 3 - padding <= GUEST_LIST_MAX_FILE_BYTES;
  }, 'Decoded CSV exceeds 5 MiB');

function isCanonicalBase64(value: string): boolean {
  if (value.length > GUEST_LIST_MAX_BASE64_LENGTH || value.length % 4 !== 0) return false;
  const firstPadding = value.indexOf('=');
  const contentEnd = firstPadding === -1 ? value.length : firstPadding;
  const paddingLength = value.length - contentEnd;
  if (paddingLength > 2) return false;
  for (let index = contentEnd; index < value.length; index += 1) {
    if (value[index] !== '=') return false;
  }
  for (let index = 0; index < contentEnd; index += 1) {
    const code = value.charCodeAt(index);
    const valid =
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      (code >= 48 && code <= 57) ||
      code === 43 ||
      code === 47;
    if (!valid) return false;
  }
  return (
    paddingLength === 0 ||
    (paddingLength === 1 && contentEnd % 4 === 3) ||
    (paddingLength === 2 && contentEnd % 4 === 2)
  );
}

export const AdminGuestListUploadRequestSchema = z
  .object({
    sourceName: z.string().trim().min(1).max(180),
    contentType: GuestListContentTypeSchema,
    contentBase64: base64Schema,
  })
  .strict();

export const GUEST_LIST_BATCH_STATUSES = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'COMPLETED_WITH_ERRORS',
  'FAILED',
] as const;

export const GuestListBatchStatusSchema = z.enum(GUEST_LIST_BATCH_STATUSES);
export const GuestListReportableBatchStatusSchema = z.enum(['COMPLETED', 'COMPLETED_WITH_ERRORS']);
export const GuestListNonReportableBatchStatusSchema = z.enum(['PENDING', 'PROCESSING', 'FAILED']);

const counterSchema = z.number().int().nonnegative();
const timestampSchema = z.string().datetime({ offset: true });

export const GuestListReportSummarySchema = z
  .object({
    totalRows: counterSchema,
    validRows: counterSchema,
    invalidRows: counterSchema,
    duplicateRows: counterSchema,
    importedRows: counterSchema,
    updatedRows: counterSchema,
    cancelledRows: counterSchema,
    conflictRows: counterSchema,
  })
  .strict();

export const PublicGuestListBatchSchema = z
  .object({
    id: z.string().uuid(),
    concertId: z.string().uuid(),
    sourceName: z.string().min(1).max(180),
    checksum: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .nullable(),
    importSequence: z.number().int().positive(),
    status: GuestListBatchStatusSchema,
    reportAvailable: z.boolean(),
    processingAttempt: counterSchema,
    totalRows: counterSchema,
    validRows: counterSchema,
    invalidRows: counterSchema,
    duplicateRows: counterSchema,
    importedRows: counterSchema,
    updatedRows: counterSchema,
    cancelledRows: counterSchema,
    conflictRows: counterSchema,
    failureCode: z.string().min(1).max(120).nullable(),
    failureMessage: z.string().min(1).nullable(),
    startedAt: timestampSchema.nullable(),
    completedAt: timestampSchema.nullable(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();

export const GuestListBatchListResponseSchema = z.array(PublicGuestListBatchSchema);
export const GuestListBatchDetailResponseSchema = PublicGuestListBatchSchema;

export const GuestListImportOutcomeSchema = z.enum(['CREATED', 'IDEMPOTENT_DUPLICATE']);
export const AdminGuestListUploadResponseSchema = z
  .object({
    outcome: GuestListImportOutcomeSchema,
    batch: PublicGuestListBatchSchema,
  })
  .strict();

export const GUEST_LIST_ACTIONS = ['UPSERT', 'CANCEL'] as const;
export const GuestListActionSchema = z.enum(GUEST_LIST_ACTIONS);
export const GUEST_LIST_ROW_DISPOSITIONS = [
  'IMPORTED',
  'UPDATED',
  'CANCELLED',
  'INVALID',
  'DUPLICATE',
  'CONFLICT',
] as const;
export const GuestListRowDispositionSchema = z.enum(GUEST_LIST_ROW_DISPOSITIONS);

export const GuestListReportRowSchema = z
  .object({
    rowNumber: z.number().int().min(2),
    action: GuestListActionSchema,
    guestName: z.string().max(180).nullable(),
    email: z.string().max(320).nullable(),
    phone: z.string().max(40).nullable(),
    externalRef: z.string().max(160).nullable(),
    disposition: GuestListRowDispositionSchema,
    reasonCode: z.string().max(120).nullable(),
    reasonMessage: z.string().nullable(),
  })
  .strict();

export const GuestListReportSchema = z
  .object({
    batchId: z.string().uuid(),
    concertId: z.string().uuid(),
    checksum: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .nullable(),
    summary: GuestListReportSummarySchema,
    rows: z.array(GuestListReportRowSchema),
  })
  .strict();

export const GuestListBatchNotCompletedErrorSchema = z
  .object({
    error: z.literal('BATCH_NOT_COMPLETED'),
    status: GuestListNonReportableBatchStatusSchema,
    message: z.string().min(1),
  })
  .strict();

export type GuestListContentType = z.infer<typeof GuestListContentTypeSchema>;
export type AdminGuestListUploadRequest = z.infer<typeof AdminGuestListUploadRequestSchema>;
export type GuestListBatchStatus = z.infer<typeof GuestListBatchStatusSchema>;
export type GuestListReportableBatchStatus = z.infer<typeof GuestListReportableBatchStatusSchema>;
export type GuestListNonReportableBatchStatus = z.infer<
  typeof GuestListNonReportableBatchStatusSchema
>;
export type GuestListReportSummary = z.infer<typeof GuestListReportSummarySchema>;
export type PublicGuestListBatch = z.infer<typeof PublicGuestListBatchSchema>;
export type GuestListBatchListResponse = z.infer<typeof GuestListBatchListResponseSchema>;
export type GuestListBatchDetailResponse = z.infer<typeof GuestListBatchDetailResponseSchema>;
export type GuestListImportOutcome = z.infer<typeof GuestListImportOutcomeSchema>;
export type AdminGuestListUploadResponse = z.infer<typeof AdminGuestListUploadResponseSchema>;
export type GuestListAction = z.infer<typeof GuestListActionSchema>;
export type GuestListRowDisposition = z.infer<typeof GuestListRowDispositionSchema>;
export type GuestListReportRow = z.infer<typeof GuestListReportRowSchema>;
export type GuestListReport = z.infer<typeof GuestListReportSchema>;
export type GuestListBatchNotCompletedError = z.infer<typeof GuestListBatchNotCompletedErrorSchema>;
