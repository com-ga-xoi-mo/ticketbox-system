import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from './client';
import { useNavigate } from 'react-router-dom';

export function useExecuteResalePurchase() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (listingId: string) => {
      return apiPost<any>('/resale/purchase', { listingId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['resale-feed'] });
      queryClient.invalidateQueries({ queryKey: ['resale-listing'] });
      navigate('/account/tickets');
    }
  });
}
