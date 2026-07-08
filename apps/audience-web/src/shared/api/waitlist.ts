import {
  JoinWaitlistRequestSchema,
  LeaveWaitlistResponseSchema,
  WaitlistStatusResponseSchema,
  type JoinWaitlistRequest,
  type LeaveWaitlistResponse,
  type WaitlistStatusResponse,
} from '@ticketbox/api-types';

import { apiDelete, apiGet, apiPost } from './client';

export const waitlistKeys = {
  all: ['waitlist'] as const,
  status: (concertId: string, ticketTypeId: string) =>
    [...waitlistKeys.all, 'status', concertId, ticketTypeId] as const,
};

export async function joinWaitlist(
  input: JoinWaitlistRequest,
): Promise<WaitlistStatusResponse> {
  const dto = JoinWaitlistRequestSchema.parse(input);
  const response = await apiPost<unknown>('/me/waitlist', dto);
  return WaitlistStatusResponseSchema.parse(response);
}

export async function leaveWaitlist(
  ticketTypeId: string,
): Promise<LeaveWaitlistResponse> {
  const response = await apiDelete<unknown>(`/me/waitlist/${ticketTypeId}`);
  return LeaveWaitlistResponseSchema.parse(response);
}

export async function fetchWaitlistStatus(input: {
  concertId: string;
  ticketTypeId: string;
}): Promise<WaitlistStatusResponse> {
  const params = new URLSearchParams({
    concertId: input.concertId,
    ticketTypeId: input.ticketTypeId,
  });
  const response = await apiGet<unknown>(`/me/waitlist/status?${params.toString()}`);
  return WaitlistStatusResponseSchema.parse(response);
}
