import {
  LotteryStatusResponseSchema,
  RunLotteryDrawNowResponseSchema,
  RegisterForLotteryRequestSchema,
  ConfigureLotteryRequestSchema,
  ConfigureLotteryResponseSchema,
  LotteryRegistrationListResponseSchema,
  WithdrawLotteryResponseSchema,
  type ConfigureLotteryRequest,
  type ConfigureLotteryResponse,
  type LotteryRegistrationListResponse,
  type LotteryStatusResponse,
  type RegisterForLotteryRequest,
  type RunLotteryDrawNowResponse,
  type WithdrawLotteryResponse,
} from '@ticketbox/api-types';

import { apiDelete, apiGet, apiPost } from './client';

export const lotteryKeys = {
  all: ['lottery'] as const,
  status: (ticketTypeId: string) => [...lotteryKeys.all, 'status', ticketTypeId] as const,
  registrations: (ticketTypeId: string) =>
    [...lotteryKeys.all, 'registrations', ticketTypeId] as const,
  config: (ticketTypeId: string) => [...lotteryKeys.all, 'config', ticketTypeId] as const,
};

export async function registerForLottery(
  input: RegisterForLotteryRequest,
): Promise<LotteryStatusResponse> {
  const dto = RegisterForLotteryRequestSchema.parse(input);
  const response = await apiPost<unknown>('/me/lottery', dto);
  return LotteryStatusResponseSchema.parse(response);
}

export async function withdrawFromLottery(
  ticketTypeId: string,
): Promise<WithdrawLotteryResponse> {
  const response = await apiDelete<unknown>(`/me/lottery/${ticketTypeId}`);
  return WithdrawLotteryResponseSchema.parse(response);
}

export async function fetchLotteryStatus(input: {
  ticketTypeId: string;
}): Promise<LotteryStatusResponse> {
  const params = new URLSearchParams({ ticketTypeId: input.ticketTypeId });
  const response = await apiGet<unknown>(`/me/lottery/status?${params.toString()}`);
  return LotteryStatusResponseSchema.parse(response);
}

export async function configureLottery(
  input: ConfigureLotteryRequest,
): Promise<ConfigureLotteryResponse> {
  const dto = ConfigureLotteryRequestSchema.parse(input);
  const response = await apiPost<unknown>('/organizer/lottery', dto);
  return ConfigureLotteryResponseSchema.parse(response);
}

export async function fetchLotteryConfig(
  ticketTypeId: string,
): Promise<ConfigureLotteryResponse> {
  const response = await apiGet<unknown>(`/organizer/lottery/${ticketTypeId}`);
  return ConfigureLotteryResponseSchema.parse(response);
}

export async function runLotteryDrawNow(
  ticketTypeId: string,
): Promise<RunLotteryDrawNowResponse> {
  const response = await apiPost<unknown>(
    `/organizer/lottery/${ticketTypeId}/draw-now`,
    {},
  );
  return RunLotteryDrawNowResponseSchema.parse(response);
}

export async function fetchLotteryRegistrations(
  ticketTypeId: string,
): Promise<LotteryRegistrationListResponse> {
  const response = await apiGet<unknown>(`/organizer/lottery/${ticketTypeId}/registrations`);
  return LotteryRegistrationListResponseSchema.parse(response);
}
