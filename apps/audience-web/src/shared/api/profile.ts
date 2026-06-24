import { useQuery } from '@tanstack/react-query';
import {
  MyProfileResponseSchema,
  type MyProfileResponse,
} from '@ticketbox/api-types';
import { apiGet } from './client';

export const profileKeys = {
  all: ['profile'] as const,
  mine: () => [...profileKeys.all, 'mine'] as const,
};

export async function fetchMyProfile(): Promise<MyProfileResponse> {
  const data = await apiGet<unknown>('/me/profile');
  return MyProfileResponseSchema.parse(data);
}

export function useMyProfile(enabled: boolean = true) {
  return useQuery({
    queryKey: profileKeys.mine(),
    queryFn: fetchMyProfile,
    enabled,
  });
}
