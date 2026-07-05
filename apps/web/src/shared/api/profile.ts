import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { get, patch, postFormData, del } from './client';

export const profileKeys = {
  all: ['profile'] as const,
  mine: () => [...profileKeys.all, 'mine'] as const,
};

export async function fetchMyProfile(): Promise<MyProfileResponse> {
  const data = await get<unknown>('/me/profile');
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
  const res = await patch<unknown>('/me/profile', validated);
  return MyProfileResponseSchema.parse(res);
}

export async function updateMyPassword(data: UpdateMyPasswordRequest): Promise<void> {
  const validated = UpdateMyPasswordRequestSchema.parse(data);
  await patch<unknown>('/me/password', validated);
}

export async function uploadMyAvatar(file: File): Promise<AvatarResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await postFormData<unknown>('/me/avatar', formData);
  return AvatarResponseSchema.parse(res);
}

export async function removeMyAvatar(): Promise<void> {
  await del<unknown>('/me/avatar');
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(profileKeys.mine(), data);
    },
  });
}

export function useUpdateMyPassword() {
  return useMutation({
    mutationFn: updateMyPassword,
  });
}

export function useUploadMyAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadMyAvatar,
    onSuccess: (data) => {
      // Invalidate to fetch full profile again, or update cache manually
      queryClient.invalidateQueries({ queryKey: profileKeys.mine() });
    },
  });
}

export function useRemoveMyAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeMyAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.mine() });
    },
  });
}
