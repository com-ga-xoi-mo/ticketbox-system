import type {
  WaitingRoomConfigRecord,
  WaitingRoomQueueStatus,
} from '../../domain/waiting-room.types';

export function serializeWaitingRoomStatus(status: WaitingRoomQueueStatus) {
  return {
    ...status,
    admissionExpiresAt: status.admissionExpiresAt?.toISOString() ?? null,
  };
}

export function serializeWaitingRoomConfig(config: WaitingRoomConfigRecord) {
  return {
    ...config,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}

