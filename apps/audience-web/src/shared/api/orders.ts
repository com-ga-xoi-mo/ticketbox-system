import { useQuery } from '@tanstack/react-query';
import type {
  CreateOrderRequest,
  InitiatePaymentRequest,
  Order,
  PaymentInitiationResponse,
  IssuedTicketSummary,
  IssuedTicketDetail,
} from '@ticketbox/api-types';
import { apiGet, apiPost } from './client';

export async function createOrder(data: CreateOrderRequest): Promise<Order> {
  return apiPost<Order>('/checkout/orders', data);
}

export async function fetchMyOrders(): Promise<Order[]> {
  return apiGet<Order[]>('/me/orders');
}

export async function fetchOrderDetail(id: string): Promise<Order> {
  return apiGet<Order>(`/me/orders/${id}`);
}

export async function initiatePayment(id: string, data: InitiatePaymentRequest): Promise<PaymentInitiationResponse> {
  return apiPost<PaymentInitiationResponse>(`/orders/${id}/payment`, data);
}

export async function fetchMyTickets(): Promise<IssuedTicketSummary[]> {
  return apiGet<IssuedTicketSummary[]>('/me/tickets');
}

export async function fetchMyTicketDetail(id: string): Promise<IssuedTicketDetail> {
  return apiGet<IssuedTicketDetail>(`/me/tickets/${id}`);
}

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
};

export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  detail: (id: string) => [...ticketKeys.all, 'detail', id] as const,
};

export function useMyOrders() {
  return useQuery({
    queryKey: orderKeys.lists(),
    queryFn: fetchMyOrders,
  });
}

export function useOrderDetail(id: string, refetchInterval?: number | false) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => fetchOrderDetail(id),
    enabled: Boolean(id),
    refetchInterval,
  });
}

export function useMyTickets() {
  return useQuery({
    queryKey: ticketKeys.lists(),
    queryFn: fetchMyTickets,
  });
}

export function useMyTicketDetail(id: string) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => fetchMyTicketDetail(id),
    enabled: Boolean(id),
  });
}

export function parseOrderError(error: unknown): string {
  const defaultError = 'Đã có lỗi xảy ra, vui lòng thử lại sau.';
  if (!(error instanceof Error)) return defaultError;

  const msg = error.message;

  if (msg.includes('INSUFFICIENT_INVENTORY') || msg.includes('Không đủ vé')) {
    return 'Số lượng vé không đủ.';
  }
  if (msg.includes('PER_USER_LIMIT_EXCEEDED') || msg.includes('vượt quá giới hạn') || msg.includes('Per-user ticket limit exceeded')) {
    return 'Bạn đã đạt giới hạn mua vé cho loại vé này.';
  }
  if (msg.includes('SALE_WINDOW_CLOSED') || msg.includes('không nằm trong thời gian bán') || msg.includes('Inactive')) {
    return 'Thời gian mở bán đã kết thúc.';
  }
  if (msg.includes('RESERVATION_EXPIRED')) {
    return 'Thời gian giữ vé đã hết.';
  }
  if (msg.includes('PAYMENT_PROVIDER_UNAVAILABLE') || msg.includes('CircuitOpen')) {
    return 'Cổng thanh toán tạm thời không khả dụng, vui lòng thử lại sau.';
  }
  if (msg.includes('RATE_LIMITED') || msg.includes('429')) {
    return 'Hệ thống đang bận, vui lòng thử lại sau.';
  }
  if (msg.includes('IDEMPOTENCY_CONFLICT') || msg.includes('ProgressError') || msg.includes('PreviouslyFailed')) {
    return 'Giao dịch đang được xử lý hoặc đã thất bại trước đó.';
  }

  // Nếu không map được từ khóa đặc thù, thử parse JSON để lấy message gốc từ backend
  try {
    const parsed = JSON.parse(msg);
    if (parsed && typeof parsed.message === 'string') {
      return parsed.message;
    }
  } catch {
    // Không phải JSON, bỏ qua
  }

  return msg || defaultError;
}

