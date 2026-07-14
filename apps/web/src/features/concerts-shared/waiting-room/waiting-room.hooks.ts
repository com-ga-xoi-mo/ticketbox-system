import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ConfigureWaitingRoomRequest,
  SetWaitingRoomOverrideRequest,
  WaitingRoomConfigResponse,
} from '@ticketbox/api-types';

import { useAuth } from '../../../shared/auth/AuthContext';
import {
  getWaitingRoomConfig,
  saveWaitingRoomConfig,
  setWaitingRoomOverride,
} from './waiting-room.api';

export interface WaitingRoomScope {
  role: 'ADMIN' | 'ORGANIZER';
  sub: string;
}

export const waitingRoomKeys = {
  all: ['waiting-room'] as const,
  detail: (scope: WaitingRoomScope, concertId: string) =>
    [...waitingRoomKeys.all, scope, concertId] as const,
};

function useWaitingRoomScope(): WaitingRoomScope {
  const { session } = useAuth();
  return {
    role: session?.roles.includes('ADMIN') ? 'ADMIN' : 'ORGANIZER',
    sub: session?.sub ?? '',
  };
}

export function useWaitingRoomConfig(concertId: string) {
  const scope = useWaitingRoomScope();
  return useQuery({
    queryKey: waitingRoomKeys.detail(scope, concertId),
    queryFn: () => getWaitingRoomConfig(concertId),
    enabled: Boolean(concertId && scope.sub),
  });
}

export function useSaveWaitingRoomConfigMutation(concertId: string) {
  const scope = useWaitingRoomScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ConfigureWaitingRoomRequest) => saveWaitingRoomConfig(concertId, payload),
    onSuccess: (config) => {
      queryClient.setQueryData<WaitingRoomConfigResponse>(
        waitingRoomKeys.detail(scope, concertId),
        config,
      );
    },
  });
}

export function useSetWaitingRoomOverrideMutation(concertId: string) {
  const scope = useWaitingRoomScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SetWaitingRoomOverrideRequest) =>
      setWaitingRoomOverride(concertId, payload),
    onSuccess: (config) => {
      queryClient.setQueryData<WaitingRoomConfigResponse>(
        waitingRoomKeys.detail(scope, concertId),
        config,
      );
    },
  });
}
