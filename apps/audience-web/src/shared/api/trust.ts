import { useQuery } from '@tanstack/react-query';
import { apiGet } from './client';

export function useSellerProfile(userId: string) {
  return useQuery({
    queryKey: ['seller-profile', userId],
    queryFn: async () => {
      return apiGet<any>(`/sellers/${userId}/profile`);
    },
    enabled: !!userId,
  });
}
