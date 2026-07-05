import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { apiGet, apiPost, apiDelete } from './client';
import { getToken } from '../auth/token-storage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export interface CreateResaleListingRequest {
  ticketId: string;
  askingPriceVnd: number;
}

export function useMyResaleListings() {
  return useQuery({
    queryKey: ['my-resale-listings'],
    queryFn: async () => {
      return apiGet<any[]>('/me/resale/listings');
    },
  });
}

export function useCreateResaleListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: CreateResaleListingRequest) => {
      return apiPost<any>('/resale/listings', req);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-resale-listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket'] });
    },
  });
}

export function useCancelResaleListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      return apiDelete<any>(`/resale/listings/${listingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-resale-listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket'] });
    },
  });
}

export function useResaleFeed(filters: { concertId?: string; sort?: string; limit?: number; search?: string; priceMin?: number; priceMax?: number }) {
  return useInfiniteQuery({
    queryKey: ['resale-feed', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const qs = new URLSearchParams();
      if (filters.concertId) qs.append('concertId', filters.concertId);
      if (filters.sort) qs.append('sort', filters.sort);
      if (filters.search) qs.append('search', filters.search);
      if (filters.priceMin !== undefined) qs.append('priceMin', String(filters.priceMin));
      if (filters.priceMax !== undefined) qs.append('priceMax', String(filters.priceMax));
      qs.append('page', String(pageParam));
      qs.append('limit', String(filters.limit ?? 20));
      return apiGet<any[]>(`/resale/listings?${qs.toString()}`);
    },
    getNextPageParam: (lastPage: any[], allPages: any[][]) =>
      lastPage.length === (filters.limit ?? 20) ? allPages.length + 1 : undefined,
    initialPageParam: 1,
  });
}

export function useResaleListingDetail(listingId: string) {
  return useQuery({
    queryKey: ['resale-listing', listingId],
    queryFn: async () => {
      return apiGet<any>(`/resale/listings/${listingId}`);
    },
    enabled: !!listingId,
  });
}

// ── Upvote ──────────────────────────────────────────────────────────────────

export function useToggleUpvote(listingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => apiPost<{ upvoteCount: number; upvotedByMe: boolean }>(`/resale/listings/${listingId}/upvote`, {}),
    onSuccess: (data) => {
      queryClient.setQueryData(['resale-listing', listingId], (old: any) =>
        old ? { ...old, upvoteCount: data.upvoteCount, upvotedByMe: data.upvotedByMe } : old
      );
      queryClient.invalidateQueries({ queryKey: ['resale-feed'] });
    },
  });
}

// ── SSE hook ────────────────────────────────────────────────────────────────

export function useListingSSE(
  listingId: string,
  handlers: {
    onUpvoteUpdated?: (data: { upvoteCount: number; upvotedByMe: boolean }) => void;
    onCommentAdded?: (data: any) => void;
  }
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!listingId) return;
    const token = getToken();
    const url = token
      ? `${BASE_URL}/resale/listings/${listingId}/events?token=${encodeURIComponent(token)}`
      : `${BASE_URL}/resale/listings/${listingId}/events`;

    const es = new EventSource(url, { withCredentials: false });

    es.addEventListener('upvote.updated', (e) => {
      try { handlersRef.current.onUpvoteUpdated?.(JSON.parse((e as MessageEvent).data)); } catch {}
    });
    es.addEventListener('comment.added', (e) => {
      try { handlersRef.current.onCommentAdded?.(JSON.parse((e as MessageEvent).data)); } catch {}
    });

    return () => es.close();
  }, [listingId]);
}

// ── Comments ─────────────────────────────────────────────────────────────────

export function useListingComments(listingId: string) {
  return useQuery({
    queryKey: ['listing-comments', listingId],
    queryFn: async () => apiGet<any[]>(`/resale/listings/${listingId}/comments`),
    enabled: !!listingId,
  });
}

export function useAddComment(listingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) =>
      apiPost<any>(`/resale/listings/${listingId}/comments`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing-comments', listingId] });
    },
  });
}

export function useAddReply(listingId: string, commentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) =>
      apiPost<any>(`/resale/listings/${listingId}/comments/${commentId}/replies`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing-comments', listingId] });
    },
  });
}

export function useFlagComment(listingId: string, commentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      apiPost<any>(`/resale/listings/${listingId}/comments/${commentId}/flag`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing-comments', listingId] });
    },
  });
}

// ── Send initial DM to seller ─────────────────────────────────────────────────

export function useInitiateDM(listingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) =>
      apiPost<any>(`/resale/listings/${listingId}/messages`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-threads'] });
    },
  });
}
