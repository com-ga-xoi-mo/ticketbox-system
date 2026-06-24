import { useQuery } from '@tanstack/react-query';
import {
  TicketDetailResponseSchema,
  TicketListResponseSchema,
  type TicketDetailResponse,
  type TicketSummaryResponse,
} from '@ticketbox/api-types';
import { apiGet } from './client';

export const ticketKeys = {
  all: ['tickets'] as const,
  list: () => [...ticketKeys.all, 'list'] as const,
  detail: (id: string) => [...ticketKeys.all, 'detail', id] as const,
};

export async function fetchMyTickets(): Promise<TicketSummaryResponse[]> {
  const data = await apiGet<unknown>('/me/tickets');
  return TicketListResponseSchema.parse(data);
}

export async function fetchTicketDetail(id: string): Promise<TicketDetailResponse> {
  const data = await apiGet<unknown>(`/me/tickets/${id}`);
  return TicketDetailResponseSchema.parse(data);
}

export function useMyTickets() {
  return useQuery({
    queryKey: ticketKeys.list(),
    queryFn: fetchMyTickets,
  });
}

export function useTicketDetail(id: string) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => fetchTicketDetail(id),
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds, qrPayload is dynamic
  });
}
