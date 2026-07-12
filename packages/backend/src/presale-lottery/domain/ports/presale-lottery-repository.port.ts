import type {
  LotteryConfigRecord,
  LotteryEntitlementNotificationContext,
  LotteryEntitlementRecord,
  LotteryNotSelectedNotificationContext,
  LotteryRegistrationListItem,
  LotteryRegistrationRecord,
  LotteryStatusRecord,
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
  entitlementTtlMinutes: number;
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
  ttlMinutes: number;
  now: Date;
}

export interface PresaleLotteryRepositoryPort {
  findTicketType(ticketTypeId: string): Promise<TicketTypeLotteryInfo | null>;
  findConfigByTicketType(ticketTypeId: string): Promise<LotteryConfigRecord | null>;
  createConfig(input: CreateLotteryConfigInput): Promise<LotteryConfigRecord>;
  updateConfigTtl(input: {
    ticketTypeId: string;
    entitlementTtlMinutes: number;
  }): Promise<LotteryConfigRecord | null>;
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

  sumActiveEntitlementQuantity(ticketTypeId: string, now: Date): Promise<number>;
  listRegisteredForDraw(ticketTypeId: string): Promise<LotteryRegistrationRecord[]>;
  /** Ticket type ids of SCHEDULED lotteries whose drawAt has passed. */
  listDueDrawTicketTypeIds(now: Date): Promise<string[]>;

  /** Serialize draw work per ticket type. */
  withConfigLock<T>(ticketTypeId: string, work: () => Promise<T>): Promise<T>;
  /** Transition SCHEDULED → DRAWING atomically; returns null if not SCHEDULED (idempotent). */
  beginDraw(ticketTypeId: string): Promise<LotteryConfigRecord | null>;
  /** Persist winners/non-winners/entitlements/audit and set config COMPLETED. */
  commitDraw(input: CommitDrawInput): Promise<LotteryEntitlementRecord[]>;

  listActiveEntitlementsExpiringSoon(input: {
    now: Date;
    reminderWindowEndsAt: Date;
    limit: number;
  }): Promise<LotteryEntitlementRecord[]>;
  expireEntitlements(now: Date): Promise<number>;

  findEntitlementNotificationContext(
    entitlementId: string,
  ): Promise<LotteryEntitlementNotificationContext | null>;
  findNotSelectedNotificationContext(
    registrationId: string,
  ): Promise<LotteryNotSelectedNotificationContext | null>;
}
