import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateRefundRequestSchema,
  CreateSupportRequestSchema,
  RefundEligibilityResponseSchema,
  RefundRequestListResponseSchema,
  RefundRequestResponseSchema,
  SupportRequestListResponseSchema,
  SupportRequestResponseSchema,
  type CreateRefundRequest,
  type CreateSupportRequest,
  type RefundEligibilityResponse,
  type RefundRequestResponse,
  type SupportRequestResponse,
} from '@ticketbox/api-types';
import { apiGet, apiPost } from './client';

export const supportKeys = {
  all: ['audience-support'] as const,
  supportRequests: () => [...supportKeys.all, 'support-requests'] as const,
  supportRequest: (id: string) => [...supportKeys.supportRequests(), id] as const,
  refundRequests: () => [...supportKeys.all, 'refund-requests'] as const,
  refundRequest: (id: string) => [...supportKeys.refundRequests(), id] as const,
  refundEligibility: (params: { orderId?: string; ticketId?: string }) =>
    [...supportKeys.all, 'refund-eligibility', params.orderId ?? null, params.ticketId ?? null] as const,
};

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function fetchSupportRequests(): Promise<SupportRequestResponse[]> {
  const data = await apiGet<unknown>('/me/support-requests');
  return SupportRequestListResponseSchema.parse(data);
}

export async function fetchSupportRequest(id: string): Promise<SupportRequestResponse> {
  const data = await apiGet<unknown>(`/me/support-requests/${id}`);
  return SupportRequestResponseSchema.parse(data);
}

export async function createSupportRequest(
  input: CreateSupportRequest,
): Promise<SupportRequestResponse> {
  const payload = CreateSupportRequestSchema.parse(input);
  const data = await apiPost<unknown>('/me/support-requests', payload);
  return SupportRequestResponseSchema.parse(data);
}

export async function fetchRefundEligibility(params: {
  orderId?: string;
  ticketId?: string;
}): Promise<RefundEligibilityResponse> {
  const data = await apiGet<unknown>(`/me/refund-eligibility${buildQuery(params)}`);
  return RefundEligibilityResponseSchema.parse(data);
}

export async function fetchRefundRequests(): Promise<RefundRequestResponse[]> {
  const data = await apiGet<unknown>('/me/refund-requests');
  return RefundRequestListResponseSchema.parse(data);
}

export async function fetchRefundRequest(id: string): Promise<RefundRequestResponse> {
  const data = await apiGet<unknown>(`/me/refund-requests/${id}`);
  return RefundRequestResponseSchema.parse(data);
}

export async function createRefundRequest(
  input: CreateRefundRequest,
): Promise<RefundRequestResponse> {
  const payload = CreateRefundRequestSchema.parse(input);
  const data = await apiPost<unknown>('/me/refund-requests', payload);
  return RefundRequestResponseSchema.parse(data);
}

export function useSupportRequests() {
  return useQuery({
    queryKey: supportKeys.supportRequests(),
    queryFn: fetchSupportRequests,
  });
}

export function useSupportRequest(id?: string) {
  return useQuery({
    queryKey: supportKeys.supportRequest(id ?? ''),
    queryFn: () => fetchSupportRequest(id as string),
    enabled: !!id,
  });
}

export function useCreateSupportRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupportRequest,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: supportKeys.supportRequests() });
      queryClient.setQueryData(supportKeys.supportRequest(data.id), data);
    },
  });
}

export function useRefundEligibility(params: { orderId?: string; ticketId?: string }) {
  return useQuery({
    queryKey: supportKeys.refundEligibility(params),
    queryFn: () => fetchRefundEligibility(params),
    enabled: Boolean(params.orderId || params.ticketId),
  });
}

export function useRefundRequests() {
  return useQuery({
    queryKey: supportKeys.refundRequests(),
    queryFn: fetchRefundRequests,
  });
}

export function useRefundRequest(id?: string) {
  return useQuery({
    queryKey: supportKeys.refundRequest(id ?? ''),
    queryFn: () => fetchRefundRequest(id as string),
    enabled: !!id,
  });
}

export function useCreateRefundRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRefundRequest,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: supportKeys.refundRequests() });
      queryClient.invalidateQueries({ queryKey: supportKeys.refundEligibility({ orderId: data.orderId }) });
      if (data.ticketId) {
        queryClient.invalidateQueries({
          queryKey: supportKeys.refundEligibility({ ticketId: data.ticketId }),
        });
      }
      queryClient.setQueryData(supportKeys.refundRequest(data.id), data);
    },
  });
}

export function parseSupportError(error: unknown): string {
  const defaultError = 'Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau.';
  if (!(error instanceof Error)) return defaultError;

  const message = error.message;
  const mappings: Array<[string[], string]> = [
    [['404', 'not found', 'Order not found', 'Ticket not found'], 'Không tìm thấy đơn hàng hoặc vé trong tài khoản của bạn.'],
    [['Duplicate', 'active refund', 'existingRequestId'], 'Bạn đã có yêu cầu hoàn tiền đang xử lý cho mục này.'],
    [['ORDER_NOT_PAID'], 'Đơn hàng chưa thanh toán nên chưa thể yêu cầu hoàn tiền.'],
    [['ORDER_FINALIZED'], 'Đơn hàng đã ở trạng thái cuối và không thể yêu cầu hoàn tiền.'],
    [['TICKET_NOT_REFUNDABLE'], 'Vé này hiện không đủ điều kiện yêu cầu hoàn tiền.'],
    [['COOLDOWN', 'cooldown', '429'], 'Bạn vừa gửi yêu cầu. Vui lòng thử lại sau ít phút.'],
    [['Unauthorized', '401'], 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'],
  ];

  for (const [patterns, userMessage] of mappings) {
    if (patterns.some((pattern) => message.toLowerCase().includes(pattern.toLowerCase()))) {
      return userMessage;
    }
  }

  try {
    const parsed = JSON.parse(message) as { message?: unknown };
    if (typeof parsed.message === 'string') return parsed.message;
  } catch {
    // Keep the plain message from the API client.
  }

  return message || defaultError;
}
