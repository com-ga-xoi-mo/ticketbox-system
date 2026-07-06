import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from './client';

export function useMyThreads() {
  return useQuery({
    queryKey: ['dm-threads'],
    queryFn: async () => {
      return apiGet<any[]>('/me/messages/threads');
    },
    refetchInterval: 30000, // 30s polling fallback
  });
}

export function useThreadMessages(threadId: string) {
  return useQuery({
    queryKey: ['dm-messages', threadId],
    queryFn: async () => {
      return apiGet<any[]>(`/me/messages/threads/${threadId}`);
    },
    enabled: !!threadId,
  });
}

export function useSendMessage(listingId: string, threadId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const url = threadId 
        ? `/resale/listings/${listingId}/messages/${threadId}`
        : `/resale/listings/${listingId}/messages`;
      return apiPost<any>(url, { body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-messages'] });
      queryClient.invalidateQueries({ queryKey: ['dm-threads'] });
    }
  });
}
