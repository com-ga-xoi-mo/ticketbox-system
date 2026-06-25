import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAccountKeys } from '../accounts/hooks';
import {
  getAssignments,
  assignStaff,
  revokeAssignment,
  bulkCreateStaff,
  AssignStaffPayload,
  BulkCreateStaffPayload,
} from './api';

export const assignmentKeys = {
  all: ['assignments'] as const,
  lists: () => [...assignmentKeys.all, 'list'] as const,
  list: (concertId: string) => [...assignmentKeys.lists(), concertId] as const,
};

export function useAssignments(concertId: string) {
  return useQuery({
    queryKey: assignmentKeys.list(concertId),
    queryFn: () => getAssignments(concertId),
    enabled: !!concertId,
  });
}

export function useAssignStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ concertId, payload }: { concertId: string; payload: AssignStaffPayload }) =>
      assignStaff(concertId, payload),
    onSuccess: (_, { concertId }) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.list(concertId) });
    },
  });
}

export function useBulkCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ concertId, payload }: { concertId: string; payload: BulkCreateStaffPayload }) =>
      bulkCreateStaff(concertId, payload),
    onSuccess: (_, { concertId }) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.list(concertId) });
      queryClient.invalidateQueries({ queryKey: adminAccountKeys.lists() });
    },
  });
}

export function useRevokeAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ concertId, assignmentId }: { concertId: string; assignmentId: string }) =>
      revokeAssignment(concertId, assignmentId),
    onSuccess: (_, { concertId }) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.list(concertId) });
    },
  });
}
