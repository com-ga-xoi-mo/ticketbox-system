export const WAITING_ROOM_ADMISSION_PORT = Symbol('WaitingRoomAdmissionPort');

export interface WaitingRoomAdmissionPort {
  incrementLoad(concertId: string): Promise<void>;
  validate(input: {
    concertId: string;
    userId: string;
    token?: string;
  }): Promise<void>;
  release(input: { concertId: string; userId: string }): Promise<void>;
  consumeAndHoldSlot(input: {
    concertId: string;
    userId: string;
    holdTtlMinutes: number;
  }): Promise<void>;
}

