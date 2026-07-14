import {
  AdminGuestListUploadRequestSchema,
  AdminGuestListUploadResponseSchema,
  GuestListBatchDetailResponseSchema,
  GuestListBatchListResponseSchema,
  GuestListBatchNotCompletedErrorSchema,
  GuestListReportSchema,
  type AdminGuestListUploadRequest,
  type AdminGuestListUploadResponse,
  type GuestListBatchNotCompletedError,
  type GuestListReport,
  type PublicGuestListBatch,
} from '@ticketbox/api-types';

import { ApiError, get, post } from '../../../shared/api/client';
import { parseResponse } from '../../../shared/api/parse-response';

export class GuestListReportUnavailableError extends Error {
  constructor(public readonly detail: GuestListBatchNotCompletedError) {
    super(detail.message);
    this.name = 'GuestListReportUnavailableError';
  }
}

function guestListPath(concertId: string): string {
  return `/admin/concerts/${concertId}/guest-list/imports`;
}

export async function uploadGuestList(
  concertId: string,
  request: AdminGuestListUploadRequest,
): Promise<AdminGuestListUploadResponse> {
  const payload = AdminGuestListUploadRequestSchema.parse(request);
  const response = await post<unknown>(guestListPath(concertId), payload);
  return parseResponse(AdminGuestListUploadResponseSchema, response);
}

export async function listGuestListBatches(concertId: string): Promise<PublicGuestListBatch[]> {
  const response = await get<unknown>(guestListPath(concertId));
  return parseResponse(GuestListBatchListResponseSchema, response);
}

export async function getGuestListBatch(
  concertId: string,
  batchId: string,
): Promise<PublicGuestListBatch> {
  const response = await get<unknown>(`${guestListPath(concertId)}/${batchId}`);
  return parseResponse(GuestListBatchDetailResponseSchema, response);
}

export async function getGuestListReport(
  concertId: string,
  batchId: string,
): Promise<GuestListReport> {
  try {
    const response = await get<unknown>(`${guestListPath(concertId)}/${batchId}/report`);
    return parseResponse(GuestListReportSchema, response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      const detail = GuestListBatchNotCompletedErrorSchema.safeParse(error.body);
      if (detail.success) throw new GuestListReportUnavailableError(detail.data);
    }
    throw error;
  }
}
