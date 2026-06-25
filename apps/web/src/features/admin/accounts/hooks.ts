import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  updateAccountStatus,
  CreateAccountPayload,
  UpdateAccountPayload,
  UpdateAccountStatusPayload,
} from './api';

export const adminAccountKeys = {
  all: ['admin-accounts'] as const,
  lists: () => [...adminAccountKeys.all, 'list'] as const,
  list: (role?: string, status?: string, unassigned?: boolean) => [...adminAccountKeys.lists(), { role, status, unassigned }] as const,
  details: () => [...adminAccountKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminAccountKeys.details(), id] as const,
};

export function useAccounts(role?: string, status?: string, unassigned?: boolean) {
  return useQuery({
    queryKey: adminAccountKeys.list(role, status, unassigned),
    queryFn: () => getAccounts(role, status, unassigned),
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: adminAccountKeys.detail(id),
    queryFn: () => getAccount(id),
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAccountPayload) => createAccount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminAccountKeys.lists() });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAccountPayload }) => updateAccount(id, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminAccountKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: adminAccountKeys.lists() });
    },
  });
}

export function useUpdateAccountStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAccountStatusPayload }) => updateAccountStatus(id, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminAccountKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: adminAccountKeys.lists() });
    },
  });
}
