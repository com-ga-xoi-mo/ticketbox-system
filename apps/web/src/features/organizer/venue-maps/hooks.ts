import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { venueMapKeys } from '../../concerts-shared/query-keys';
import { useAuth } from '../../../shared/auth/AuthContext';
import {
  getSeatingMap,
  getSeatingZones,
  getTicketTypes,
  uploadSeatingMap,
  saveSeatingZones,
  createTicketType,
  updateTicketType,
  archiveTicketType,
  mapZonesToTicketType,
} from './api';

export function useVenueMapScope() {
  const { session } = useAuth();
  return { role: 'ORGANIZER' as const, sub: session?.sub ?? '' };
}

export function useVenueMapEditor(concertId: string) {
  const scope = useVenueMapScope();
  return useQuery({
    queryKey: venueMapKeys.editor(scope, concertId),
    queryFn: async () => {
      const [seatingMap, seatingZones, ticketTypes] = await Promise.all([
        getSeatingMap(concertId),
        getSeatingZones(concertId),
        getTicketTypes(concertId),
      ]);
      return { seatingMap, seatingZones, ticketTypes };
    },
    enabled: !!concertId && !!scope.sub,
  });
}

export function useUploadSeatingMapMutation() {
  const queryClient = useQueryClient();
  const scope = useVenueMapScope();

  return useMutation({
    mutationFn: ({ concertId, file }: { concertId: string; file: File }) =>
      uploadSeatingMap(concertId, file),
    onSuccess: (_, { concertId }) => {
      toast.success('Upload sơ đồ thành công');
      void queryClient.invalidateQueries({ queryKey: venueMapKeys.editor(scope, concertId) });
    },
    onError: () => toast.error('Lỗi khi upload sơ đồ'),
  });
}

export function useSaveSeatingZonesMutation() {
  const queryClient = useQueryClient();
  const scope = useVenueMapScope();

  return useMutation({
    mutationFn: ({ concertId, payload }: { concertId: string; payload: any }) =>
      saveSeatingZones(concertId, payload),
    onSuccess: (_, { concertId }) => {
      toast.success('Lưu các khu vực chỗ ngồi thành công');
      void queryClient.invalidateQueries({ queryKey: venueMapKeys.editor(scope, concertId) });
    },
    onError: () => toast.error('Lỗi khi lưu khu vực chỗ ngồi'),
  });
}

export function useCreateTicketTypeMutation() {
  const queryClient = useQueryClient();
  const scope = useVenueMapScope();

  return useMutation({
    mutationFn: ({ concertId, payload }: { concertId: string; payload: any }) =>
      createTicketType(concertId, payload),
    onSuccess: (_, { concertId }) => {
      toast.success('Tạo vé thành công');
      void queryClient.invalidateQueries({ queryKey: venueMapKeys.editor(scope, concertId) });
    },
    onError: () => toast.error('Lỗi khi tạo vé'),
  });
}

export function useUpdateTicketTypeMutation() {
  const queryClient = useQueryClient();
  const scope = useVenueMapScope();

  return useMutation({
    mutationFn: ({ concertId, ticketTypeId, payload }: { concertId: string; ticketTypeId: string; payload: any }) =>
      updateTicketType(concertId, ticketTypeId, payload),
    onSuccess: (_, { concertId }) => {
      toast.success('Cập nhật vé thành công');
      void queryClient.invalidateQueries({ queryKey: venueMapKeys.editor(scope, concertId) });
    },
    onError: () => toast.error('Lỗi khi cập nhật vé'),
  });
}

export function useArchiveTicketTypeMutation() {
  const queryClient = useQueryClient();
  const scope = useVenueMapScope();

  return useMutation({
    mutationFn: ({ concertId, ticketTypeId }: { concertId: string; ticketTypeId: string }) =>
      archiveTicketType(concertId, ticketTypeId),
    onSuccess: (_, { concertId }) => {
      toast.success('Lưu trữ vé thành công');
      void queryClient.invalidateQueries({ queryKey: venueMapKeys.editor(scope, concertId) });
    },
    onError: () => toast.error('Lỗi khi lưu trữ vé'),
  });
}

export function useMapZonesToTicketTypeMutation() {
  const queryClient = useQueryClient();
  const scope = useVenueMapScope();

  return useMutation({
    mutationFn: ({ concertId, ticketTypeId, payload }: { concertId: string; ticketTypeId: string; payload: any }) =>
      mapZonesToTicketType(concertId, ticketTypeId, payload),
    onSuccess: (_, { concertId }) => {
      toast.success('Lưu mapping vé với khu vực thành công');
      void queryClient.invalidateQueries({ queryKey: venueMapKeys.editor(scope, concertId) });
    },
    onError: () => toast.error('Lỗi khi lưu mapping'),
  });
}
