export const WAITING_ROOM_MANUAL_OVERRIDES = [
  'NONE',
  'FORCE_ON',
  'FORCE_OFF',
] as const;

export type WaitingRoomManualOverride =
  (typeof WAITING_ROOM_MANUAL_OVERRIDES)[number];

export const WAITING_ROOM_STATUSES = [
  'INACTIVE',
  'WAITING',
  'ADMITTED',
  'LEFT',
] as const;

export type WaitingRoomStatus = (typeof WAITING_ROOM_STATUSES)[number];

export const WAITING_ROOM_LOAD_STATES = ['ACTIVE', 'INACTIVE'] as const;

export type WaitingRoomLoadState = (typeof WAITING_ROOM_LOAD_STATES)[number];

export interface WaitingRoomConfigRecord {
  id: string;
  concertId: string;
  enabled: boolean;
  autoActivate: boolean;
  manualOverride: WaitingRoomManualOverride;
  maxConcurrency: number;
  admissionTtlSeconds: number;
  activateThreshold: number;
  deactivateThreshold: number;
  cooldownSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaitingRoomConfigInput {
  concertId: string;
  enabled: boolean;
  autoActivate: boolean;
  manualOverride: WaitingRoomManualOverride;
  maxConcurrency: number;
  admissionTtlSeconds: number;
  activateThreshold: number;
  deactivateThreshold: number;
  cooldownSeconds: number;
}

export interface EffectiveWaitingRoomState {
  active: boolean;
  reason:
    | 'NO_CONFIG'
    | 'DISABLED'
    | 'FORCE_OFF'
    | 'FORCE_ON'
    | 'AUTO_ACTIVE'
    | 'AUTO_INACTIVE';
}

export interface WaitingRoomQueueStatus {
  concertId: string;
  userId: string;
  active: boolean;
  status: WaitingRoomStatus;
  position: number | null;
  admissionToken: string | null;
  admissionExpiresAt: Date | null;
}

export interface AdmissionTokenRecord {
  token: string;
  concertId: string;
  userId: string;
  expiresAt: Date;
}

export interface WaitingRoomLoadSnapshot {
  counter: number;
  state: WaitingRoomLoadState;
  lastBelowThresholdAt: Date | null;
}

export interface AdmitWaitingRoomResult {
  admitted: AdmissionTokenRecord[];
  expiredUserIds: string[];
}
