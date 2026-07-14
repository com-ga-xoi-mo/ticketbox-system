import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminGuestListUploadRequest,
  GuestListBatchStatus,
  PublicGuestListBatch,
} from '@ticketbox/api-types';

import {
  getGuestListBatch,
  getGuestListReport,
  listGuestListBatches,
  uploadGuestList,
} from './api';

export const guestListKeys = {
  all: ['admin-guest-list'] as const,
  batches: (concertId: string) => [...guestListKeys.all, concertId, 'batches'] as const,
  batch: (concertId: string, batchId: string) =>
    [...guestListKeys.batches(concertId), batchId] as const,
  report: (concertId: string, batchId: string) =>
    [...guestListKeys.batch(concertId, batchId), 'report'] as const,
};

const NON_TERMINAL = new Set<GuestListBatchStatus>(['PENDING', 'PROCESSING']);
const REPORTABLE = new Set<GuestListBatchStatus>(['COMPLETED', 'COMPLETED_WITH_ERRORS']);

export function guestListPollingInterval(
  batches: PublicGuestListBatch[] | undefined,
): number | false {
  return batches?.some(({ status }) => NON_TERMINAL.has(status)) ? 2_000 : false;
}

export function isGuestListReportable(status: GuestListBatchStatus): boolean {
  return REPORTABLE.has(status);
}

export function useGuestListBatches(concertId: string) {
  return useQuery({
    queryKey: guestListKeys.batches(concertId),
    queryFn: () => listGuestListBatches(concertId),
    enabled: Boolean(concertId),
    refetchInterval: ({ state }) => guestListPollingInterval(state.data),
  });
}

export function useGuestListBatch(concertId: string, batchId: string) {
  return useQuery({
    queryKey: guestListKeys.batch(concertId, batchId),
    queryFn: () => getGuestListBatch(concertId, batchId),
    enabled: Boolean(concertId && batchId),
  });
}

export function useGuestListReport(
  concertId: string,
  batchId: string,
  status: GuestListBatchStatus | undefined,
) {
  return useQuery({
    queryKey: guestListKeys.report(concertId, batchId),
    queryFn: () => getGuestListReport(concertId, batchId),
    enabled: Boolean(concertId && batchId && status && isGuestListReportable(status)),
    retry: false,
  });
}

export function useUploadGuestList(concertId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: AdminGuestListUploadRequest) => uploadGuestList(concertId, request),
    onSuccess: (response) => {
      queryClient.setQueryData(guestListKeys.batch(concertId, response.batch.id), response.batch);
      void queryClient.invalidateQueries({ queryKey: guestListKeys.batches(concertId) });
    },
  });
}
