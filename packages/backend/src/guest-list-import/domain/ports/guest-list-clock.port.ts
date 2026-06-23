export const GUEST_LIST_CLOCK = Symbol('GuestListClockPort');

export interface GuestListClockPort {
  now(): Date;
}
