import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  OrderConfirmationResponseSchema,
  TicketDownloadResponseSchema,
  TicketResendResponseSchema,
  type OrderConfirmationResponse,
  type TicketDownloadResponse,
  type TicketResendResponse,
} from '@ticketbox/api-types';
import { apiGet, apiPost } from './client';
import { orderKeys } from './orders';
import { ticketKeys } from './tickets';

export const downloadKeys = {
  all: ['audience-downloads'] as const,
  ticket: (id: string) => [...downloadKeys.all, 'ticket', id] as const,
  orderConfirmation: (id: string) => [...downloadKeys.all, 'order-confirmation', id] as const,
};

export async function resendOrderTickets(orderId: string): Promise<TicketResendResponse> {
  const data = await apiPost<unknown>(`/me/orders/${orderId}/resend-tickets`, {});
  return TicketResendResponseSchema.parse(data);
}

export async function resendTicket(ticketId: string): Promise<TicketResendResponse> {
  const data = await apiPost<unknown>(`/me/tickets/${ticketId}/resend`, {});
  return TicketResendResponseSchema.parse(data);
}

export async function fetchTicketDownload(ticketId: string): Promise<TicketDownloadResponse> {
  const data = await apiGet<unknown>(`/me/tickets/${ticketId}/download`);
  return TicketDownloadResponseSchema.parse(data);
}

export async function fetchOrderConfirmation(orderId: string): Promise<OrderConfirmationResponse> {
  const data = await apiGet<unknown>(`/me/orders/${orderId}/confirmation`);
  return OrderConfirmationResponseSchema.parse(data);
}

export function useResendOrderTickets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resendOrderTickets,
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
    },
  });
}

export function useResendTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resendTicket,
    onSuccess: (_data, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
    },
  });
}

export function useTicketDownload(ticketId?: string) {
  return useQuery({
    queryKey: downloadKeys.ticket(ticketId ?? ''),
    queryFn: () => fetchTicketDownload(ticketId as string),
    enabled: !!ticketId,
    staleTime: 0,
  });
}

export function useOrderConfirmation(orderId?: string) {
  return useQuery({
    queryKey: downloadKeys.orderConfirmation(orderId ?? ''),
    queryFn: () => fetchOrderConfirmation(orderId as string),
    enabled: !!orderId,
    staleTime: 60 * 1000,
  });
}
