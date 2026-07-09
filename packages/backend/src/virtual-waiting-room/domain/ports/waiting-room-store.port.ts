import type {
  AdmissionTokenRecord,
  AdmitWaitingRoomResult,
  WaitingRoomLoadSnapshot,
  WaitingRoomQueueStatus,
} from '../waiting-room.types';

export const WAITING_ROOM_STORE = Symbol('WaitingRoomStore');

export interface AdmitBatchInput {
  concertId: string;
  maxConcurrency: number;
  admissionTtlSeconds: number;
  now: Date;
}

export interface ValidateAdmissionInput {
  concertId: string;
  userId: string;
  token: string;
  now: Date;
}

export interface UpdateLoadStateInput {
  concertId: string;
  activateThreshold: number;
  deactivateThreshold: number;
  cooldownSeconds: number;
  now: Date;
}

export interface WaitingRoomStorePort {
  joinQueue(input: {
    concertId: string;
    userId: string;
    joinedAt: Date;
  }): Promise<WaitingRoomQueueStatus>;
  leave(input: { concertId: string; userId: string }): Promise<void>;
  getQueueStatus(input: {
    concertId: string;
    userId: string;
  }): Promise<WaitingRoomQueueStatus>;
  admitBatch(input: AdmitBatchInput): Promise<AdmitWaitingRoomResult>;
  validateAdmission(
    input: ValidateAdmissionInput,
  ): Promise<AdmissionTokenRecord | null>;
  releaseAdmissionSlot(input: {
    concertId: string;
    userId: string;
  }): Promise<void>;
  incrementLoad(concertId: string): Promise<number>;
  updateLoadState(input: UpdateLoadStateInput): Promise<WaitingRoomLoadSnapshot>;
  readLoadState(concertId: string): Promise<WaitingRoomLoadSnapshot>;
  withConcertLock<T>(concertId: string, work: () => Promise<T>): Promise<T>;
}
