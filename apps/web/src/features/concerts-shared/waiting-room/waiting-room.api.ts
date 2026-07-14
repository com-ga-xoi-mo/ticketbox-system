import {
  ConfigureWaitingRoomRequestSchema,
  SetWaitingRoomOverrideRequestSchema,
  WaitingRoomConfigResponseSchema,
  type ConfigureWaitingRoomRequest,
  type SetWaitingRoomOverrideRequest,
  type WaitingRoomConfigResponse,
} from '@ticketbox/api-types';

import { ApiError, get, patch, put } from '../../../shared/api/client';
import { parseResponse } from '../../../shared/api/parse-response';

const waitingRoomPath = (concertId: string) =>
  `/organizer/waiting-room/${encodeURIComponent(concertId)}`;

function parseConfig(data: unknown): WaitingRoomConfigResponse {
  const parsed = parseResponse(WaitingRoomConfigResponseSchema, data);
  return { ...parsed, manualOverride: parsed.manualOverride ?? 'NONE' };
}

export async function getWaitingRoomConfig(
  concertId: string,
): Promise<WaitingRoomConfigResponse | null> {
  try {
    const data = await get<unknown>(waitingRoomPath(concertId));
    return parseConfig(data);
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function saveWaitingRoomConfig(
  concertId: string,
  payload: ConfigureWaitingRoomRequest,
): Promise<WaitingRoomConfigResponse> {
  const request = ConfigureWaitingRoomRequestSchema.parse(payload);
  const data = await put<unknown>(waitingRoomPath(concertId), request);
  return parseConfig(data);
}

export async function setWaitingRoomOverride(
  concertId: string,
  payload: SetWaitingRoomOverrideRequest,
): Promise<WaitingRoomConfigResponse> {
  const request = SetWaitingRoomOverrideRequestSchema.parse(payload);
  const data = await patch<unknown>(`${waitingRoomPath(concertId)}/override`, request);
  return parseConfig(data);
}
