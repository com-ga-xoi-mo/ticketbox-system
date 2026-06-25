import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IssuedTicketDetailSchema,
  IssuedTicketSummarySchema,
  OrderDetailResponseSchema,
  OrderListResponseSchema,
  PaymentInitiationResponseSchema,
  type CreateOrderRequest,
  type InitiatePaymentRequest,
  type IssuedTicketDetail,
  type IssuedTicketSummary,
  type OrderDetailResponse,
  type OrderSummaryResponse,
  type PaymentInitiationResponse,
} from '@ticketbox/api-types';
import { apiGet, apiPost } from './client';

export const orderKeys = {
  all: ['orders'] as const,
  list: () => [...orderKeys.all, 'list'] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
};

export const ticketKeys = {
  all: ['tickets'] as const,
  list: () => [...ticketKeys.all, 'list'] as const,
  detail: (id: string) => [...ticketKeys.all, 'detail', id] as const,
};

export async function createOrder(data: CreateOrderRequest): Promise<OrderDetailResponse> {
  const response = await apiPost<unknown>('/checkout/orders', data);
  return OrderDetailResponseSchema.parse(response);
}

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

export async function initiatePayment(
  id: string,
  dto: InitiatePaymentRequest,
): Promise<PaymentInitiationResponse> {
  const data = await apiPost<unknown>(`/orders/${id}/payment`, dto);
  return PaymentInitiationResponseSchema.parse(data);
}

export async function fetchMyTickets(): Promise<IssuedTicketSummary[]> {
  const data = await apiGet<unknown>('/me/tickets');
  return IssuedTicketSummarySchema.array().parse(data);
}

export async function fetchMyTicketDetail(id: string): Promise<IssuedTicketDetail> {
  const data = await apiGet<unknown>(`/me/tickets/${id}`);
  return IssuedTicketDetailSchema.parse(data);
}

export function useMyOrders() {
  return useQuery({
    queryKey: orderKeys.list(),
    queryFn: fetchMyOrders,
  });
}

export function useOrderDetail(id: string, refetchInterval?: number | false) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => fetchOrderDetail(id),
    enabled: !!id,
    refetchInterval,
  });
}

export function useMyTickets() {
  return useQuery({
    queryKey: ticketKeys.list(),
    queryFn: fetchMyTickets,
  });
}

export function useMyTicketDetail(id: string) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => fetchMyTicketDetail(id),
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
    mutationFn: ({ id, dto }: { id: string; dto: InitiatePaymentRequest }) =>
      initiatePayment(id, dto),
  });
}

export function parseOrderError(error: unknown): string {
  const defaultError = 'Đã có lỗi xảy ra, vui lòng thử lại sau.';
  if (!(error instanceof Error)) return defaultError;

  const message = error.message;
  const mappings: Array<[string[], string]> = [
    [['INSUFFICIENT_INVENTORY', 'Không đủ vé'], 'Số lượng vé không đủ.'],
    [
      ['PER_USER_LIMIT_EXCEEDED', 'Per-user ticket limit exceeded', 'vượt quá giới hạn'],
      'Bạn đã đạt giới hạn mua vé cho loại vé này.',
    ],
    [
      ['SALE_WINDOW_CLOSED', 'Inactive', 'không nằm trong thời gian bán'],
      'Thời gian mở bán đã kết thúc.',
    ],
    [['RESERVATION_EXPIRED'], 'Thời gian giữ vé đã hết.'],
    [
      ['PAYMENT_PROVIDER_UNAVAILABLE', 'CircuitOpen'],
      'Cổng thanh toán tạm thời không khả dụng, vui lòng thử lại sau.',
    ],
    [['RATE_LIMITED', '429'], 'Hệ thống đang bận, vui lòng thử lại sau.'],
    [
      ['IDEMPOTENCY_CONFLICT', 'ProgressError', 'PreviouslyFailed'],
      'Giao dịch đang được xử lý hoặc đã thất bại trước đó.',
    ],
  ];

  for (const [patterns, userMessage] of mappings) {
    if (patterns.some((pattern) => message.includes(pattern))) return userMessage;
  }

  try {
    const parsed = JSON.parse(message) as { message?: unknown };
    if (typeof parsed.message === 'string') return parsed.message;
  } catch {
    // The API client may already expose a plain-text message.
  }

  return message || defaultError;
}
