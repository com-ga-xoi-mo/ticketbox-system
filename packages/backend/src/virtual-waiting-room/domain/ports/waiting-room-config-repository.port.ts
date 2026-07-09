import type {
  WaitingRoomConfigInput,
  WaitingRoomConfigRecord,
} from '../waiting-room.types';

export const WAITING_ROOM_CONFIG_REPOSITORY = Symbol(
  'WaitingRoomConfigRepository',
);

export interface WaitingRoomConfigRepositoryPort {
  findByConcertId(concertId: string): Promise<WaitingRoomConfigRecord | null>;
  upsert(input: WaitingRoomConfigInput): Promise<WaitingRoomConfigRecord>;
  setManualOverride(input: {
    concertId: string;
    manualOverride: WaitingRoomConfigInput['manualOverride'];
  }): Promise<WaitingRoomConfigRecord | null>;
  listRunnableRooms(): Promise<WaitingRoomConfigRecord[]>;
  concertExists(concertId: string): Promise<boolean>;
}
