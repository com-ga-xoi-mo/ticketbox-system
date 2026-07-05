import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AudienceNotificationListResponseSchema,
  AudienceNotificationMarkAllReadResponseSchema,
  AudienceNotificationMarkReadResponseSchema,
  AudienceNotificationUnreadCountResponseSchema,
  type AudienceNotificationItem,
  type AudienceNotificationMarkAllReadResponse,
  type AudienceNotificationMarkReadResponse,
  type AudienceNotificationUnreadCountResponse,
} from '@ticketbox/api-types';
import { apiGet, apiPost } from './client';

export const notificationKeys = {
  all: ['audience-notifications'] as const,
  list: (filters?: { unreadOnly?: boolean; type?: string }) =>
    [...notificationKeys.all, 'list', filters?.unreadOnly ?? false, filters?.type ?? null] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

function buildNotificationQuery(filters?: { unreadOnly?: boolean; type?: string }): string {
  const search = new URLSearchParams();
  if (filters?.unreadOnly) search.set('unreadOnly', 'true');
  if (filters?.type) search.set('type', filters.type);
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function fetchAudienceNotifications(filters?: {
  unreadOnly?: boolean;
  type?: string;
}): Promise<AudienceNotificationItem[]> {
  const data = await apiGet<unknown>(`/me/notifications${buildNotificationQuery(filters)}`);
  return AudienceNotificationListResponseSchema.parse(data);
}

export async function fetchAudienceNotificationUnreadCount(): Promise<AudienceNotificationUnreadCountResponse> {
  const data = await apiGet<unknown>('/me/notifications/unread-count');
  return AudienceNotificationUnreadCountResponseSchema.parse(data);
}

export async function markAudienceNotificationRead(
  id: string,
): Promise<AudienceNotificationMarkReadResponse> {
  const data = await apiPost<unknown>(`/me/notifications/${id}/read`, {});
  return AudienceNotificationMarkReadResponseSchema.parse(data);
}

export async function markAllAudienceNotificationsRead(): Promise<AudienceNotificationMarkAllReadResponse> {
  const data = await apiPost<unknown>('/me/notifications/read-all', {});
  return AudienceNotificationMarkAllReadResponseSchema.parse(data);
}

/** Mint a short-lived token used to open the realtime notification SSE stream. */
export async function fetchNotificationStreamToken(): Promise<{ token: string }> {
  return apiGet<{ token: string }>('/me/notifications/stream-token');
}

export function useAudienceNotifications(filters?: { unreadOnly?: boolean; type?: string }) {
  return useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: () => fetchAudienceNotifications(filters),
  });
}

export function useAudienceNotificationUnreadCount(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: fetchAudienceNotificationUnreadCount,
    enabled,
    staleTime: 10 * 1000,
    // Realtime updates come from the SSE stream (NotificationStreamListener); this slow
    // poll is only a safety-net fallback for missed signals / lost connections.
    refetchInterval: 60_000,
  });
}

export function useMarkAudienceNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAudienceNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllAudienceNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllAudienceNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
