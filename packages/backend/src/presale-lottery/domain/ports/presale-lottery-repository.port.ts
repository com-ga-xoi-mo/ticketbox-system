import type {
  LotteryConfigRecord,
  LotteryNotSelectedNotificationContext,
  LotteryRegistrationListItem,
  LotteryRegistrationRecord,
  LotteryStatusRecord,
  LotteryWinnerNotificationContext,
  TicketTypeLotteryInfo,
} from '../lottery.types';
import type { DrawWinner } from '../lottery-draw';

export const PRESALE_LOTTERY_REPOSITORY = Symbol('PresaleLotteryRepository');

export interface CreateLotteryConfigInput {
  ticketTypeId: string;
  concertId: string;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  drawAt: Date;
  allocation: number;
  /** Ticket sale start - opens the presale gate window on the ticket type. */
  saleStartsAt: Date;
  /** Public sale start — closes the presale gate window on the ticket type. */
  publicSaleStartsAt: Date;
}

export interface CreateLotteryRegistrationInput {
  userId: string;
  concertId: string;
  ticketTypeId: string;
  desiredQuantity: number;
  registeredAt: Date;
}

export interface CommitDrawInput {
  configId: string;
  ticketTypeId: string;
  concertId: string;
  seed: string;
  registrantCount: number;
  winners: DrawWinner[];
  notSelectedRegistrationIds: string[];
  allocationConsumed: number;
  now: Date;
}

export interface PresaleLotteryRepositoryPort {
  findTicketType(ticketTypeId: string): Promise<TicketTypeLotteryInfo | null>;
  findConfigByTicketType(ticketTypeId: string): Promise<LotteryConfigRecord | null>;
  createConfig(input: CreateLotteryConfigInput): Promise<LotteryConfigRecord>;
  cancelConfig(ticketTypeId: string, now: Date): Promise<LotteryConfigRecord | null>;
  listRegistrations(ticketTypeId: string): Promise<LotteryRegistrationListItem[]>;

  countAlreadyReservedOrSoldByUser(input: {
    userId: string;
    ticketTypeId: string;
  }): Promise<number>;
  countReservedOrSoldByUsers(input: {
    ticketTypeId: string;
    userIds: string[];
  }): Promise<Map<string, number>>;

  findActiveRegistration(input: {
    userId: string;
    ticketTypeId: string;
  }): Promise<LotteryRegistrationRecord | null>;
  createRegistration(
    input: CreateLotteryRegistrationInput,
  ): Promise<LotteryRegistrationRecord>;
  withdrawRegistration(input: {
    userId: string;
    ticketTypeId: string;
    now: Date;
  }): Promise<LotteryRegistrationRecord | null>;
  getStatus(input: {
    userId: string;
    ticketTypeId: string;
    now: Date;
  }): Promise<LotteryStatusRecord>;

  listRegisteredForDraw(ticketTypeId: string): Promise<LotteryRegistrationRecord[]>;
  /** Ticket type ids of SCHEDULED lotteries whose drawAt has passed. */
  listDueDrawTicketTypeIds(now: Date): Promise<string[]>;

  /** Serialize draw work per ticket type. */
  withConfigLock<T>(ticketTypeId: string, work: () => Promise<T>): Promise<T>;
  /** Transition SCHEDULED → DRAWING atomically; returns null if not SCHEDULED (idempotent). */
  beginDraw(ticketTypeId: string): Promise<LotteryConfigRecord | null>;
  /**
   * Persist winner allotment (wonQuantity) on registrations, mark non-winners, write the audit
   * record and set config COMPLETED. Returns the winning registration ids for notification.
   */
  commitDraw(input: CommitDrawInput): Promise<string[]>;

  findWinnerNotificationContext(
    registrationId: string,
  ): Promise<LotteryWinnerNotificationContext | null>;
  findNotSelectedNotificationContext(
    registrationId: string,
  ): Promise<LotteryNotSelectedNotificationContext | null>;
}
