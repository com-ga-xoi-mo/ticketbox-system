import { useQuery } from '@tanstack/react-query';
import {
  MyProfileResponseSchema,
  type MyProfileResponse,
  UpdateMyProfileRequestSchema,
  type UpdateMyProfileRequest,
  UpdateMyPasswordRequestSchema,
  type UpdateMyPasswordRequest,
  AvatarResponseSchema,
  type AvatarResponse,
} from '@ticketbox/api-types';
import { apiGet, apiPatch, apiPostFormData, apiDelete } from './client';

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

export async function updateMyProfile(data: UpdateMyProfileRequest): Promise<MyProfileResponse> {
  const validated = UpdateMyProfileRequestSchema.parse(data);
  const res = await apiPatch<unknown>('/me/profile', validated);
  return MyProfileResponseSchema.parse(res);
}

export async function updateMyPassword(data: UpdateMyPasswordRequest): Promise<void> {
  const validated = UpdateMyPasswordRequestSchema.parse(data);
  await apiPatch<unknown>('/me/password', validated);
}

export async function uploadMyAvatar(file: File): Promise<AvatarResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiPostFormData<unknown>('/me/avatar', formData);
  return AvatarResponseSchema.parse(res);
}

export async function removeMyAvatar(): Promise<void> {
  await apiDelete<unknown>('/me/avatar');
}
