import {
  WaitingRoomStatusResponseSchema,
  WaitingRoomStreamTokenResponseSchema,
  type WaitingRoomStatusResponse,
} from '@ticketbox/api-types';

import { apiDelete, apiGet, apiPost } from './client';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export const waitingRoomKeys = {
  all: ['waiting-room'] as const,
  status: (concertId: string) => [...waitingRoomKeys.all, 'status', concertId] as const,
};

export async function fetchWaitingRoomStatus(
  concertId: string,
): Promise<WaitingRoomStatusResponse> {
  const response = await apiGet<unknown>(`/waiting-room/${concertId}/status`);
  return WaitingRoomStatusResponseSchema.parse(response);
}

export async function joinWaitingRoom(
  concertId: string,
): Promise<WaitingRoomStatusResponse> {
  const response = await apiPost<unknown>(`/waiting-room/${concertId}/join`, {});
  return WaitingRoomStatusResponseSchema.parse(response);
}

export async function leaveWaitingRoom(
  concertId: string,
): Promise<WaitingRoomStatusResponse> {
  const response = await apiDelete<unknown>(`/waiting-room/${concertId}`);
  return WaitingRoomStatusResponseSchema.parse(response);
}

export async function mintWaitingRoomStreamToken(
  concertId: string,
): Promise<string> {
  const response = await apiGet<unknown>(`/waiting-room/${concertId}/stream-token`);
  return WaitingRoomStreamTokenResponseSchema.parse(response).token;
}

export function openWaitingRoomStream(input: {
  concertId: string;
  token: string;
  onStatus: (status: WaitingRoomStatusResponse) => void;
  onError?: () => void;
}): EventSource {
  const params = new URLSearchParams({ token: input.token });
  const source = new EventSource(
    `${BASE_URL}/waiting-room/${input.concertId}/stream?${params.toString()}`,
  );

  source.addEventListener('status', (event) => {
    const parsed = WaitingRoomStatusResponseSchema.safeParse(
      JSON.parse((event as MessageEvent).data),
    );
    if (parsed.success) input.onStatus(parsed.data);
  });
  source.onerror = () => input.onError?.();
  return source;
}
