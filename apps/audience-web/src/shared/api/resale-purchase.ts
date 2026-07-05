import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from './client';
import { useNavigate } from 'react-router-dom';

export function useExecuteResalePurchase() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (listingId: string) => {
      return apiPost<{ orderId: string }>('/resale/purchase/initiate', { listingId });
    },
    onSuccess: (data) => {
      navigate(`/resale/orders/${data.orderId}`);
    }
  });
}
