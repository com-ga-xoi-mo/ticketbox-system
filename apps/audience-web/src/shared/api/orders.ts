import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  OrderDetailResponseSchema,
  OrderListResponseSchema,
  OrderSummaryResponseSchema,
  type OrderDetailResponse,
  type OrderSummaryResponse,
} from '@ticketbox/api-types';
import { apiGet, apiPost } from './client';

export const orderKeys = {
  all: ['orders'] as const,
  list: () => [...orderKeys.all, 'list'] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
};

export async function fetchMyOrders(): Promise<OrderSummaryResponse[]> {
  const data = await apiGet<unknown>('/me/orders');
  return OrderListResponseSchema.parse(data);
}

export async function fetchOrderDetail(id: string): Promise<OrderDetailResponse> {
  const data = await apiGet<unknown>(`/me/orders/${id}`);
  return OrderDetailResponseSchema.parse(data);
}

export async function cancelOrder(id: string): Promise<OrderDetailResponse> {
  const data = await apiPost<unknown>(`/me/orders/${id}/cancel`, {});
  return OrderDetailResponseSchema.parse(data);
}

// NOTE: We temporarily type dto and response as any/unknown until Payment API types are defined in api-types
export async function initiatePayment(id: string, dto: { provider: string; idempotencyKey: string }): Promise<any> {
  const data = await apiPost<any>(`/orders/${id}/payment`, dto);
  return data;
}

export function useMyOrders() {
  return useQuery({
    queryKey: orderKeys.list(),
    queryFn: fetchMyOrders,
  });
}

export function useOrderDetail(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => fetchOrderDetail(id),
    enabled: !!id,
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cancelOrder,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.list() });
    },
  });
}

export function useInitiatePayment() {
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { provider: string; idempotencyKey: string } }) => 
      initiatePayment(id, dto),
  });
}
