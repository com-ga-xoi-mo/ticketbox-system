import { beforeEach, describe, expect, it } from 'vitest';

import {
  LotteryConfigInvalidError,
  LotteryRegistrationWindowClosedError,
  LotteryQuantityExceededError,
} from '../../domain/errors';
import type {
  LotteryConfigRecord,
  LotteryEntitlementRecord,
  LotteryRegistrationRecord,
  LotteryStatusRecord,
  TicketTypeLotteryInfo,
} from '../../domain/lottery.types';
import type {
  CommitDrawInput,
  CreateLotteryConfigInput,
  CreateLotteryRegistrationInput,
  PresaleLotteryRepositoryPort,
} from '../../domain/ports/presale-lottery-repository.port';
import {
  ConfigureLotteryUseCase,
  RegisterForLotteryUseCase,
  RunLotteryDrawUseCase,
  UpdateLotteryTtlUseCase,
  type LotteryGrantNotifier,
} from './lottery.use-cases';

const TICKET_TYPE_ID = 'tt-1';
const CONCERT_ID = 'concert-1';

function makeTicketType(overrides: Partial<TicketTypeLotteryInfo> = {}): TicketTypeLotteryInfo {
  return {
    id: TICKET_TYPE_ID,
    concertId: CONCERT_ID,
    totalQuantity: 100,
    reservedQuantity: 0,
    soldQuantity: 0,
    maxPerUser: 4,
    status: 'ACTIVE',
    saleStartsAt: new Date('2026-01-01T00:00:00Z'),
    saleEndsAt: new Date('2026-12-31T00:00:00Z'),
    ...overrides,
  };
}

function makeConfig(overrides: Partial<LotteryConfigRecord> = {}): LotteryConfigRecord {
  return {
    id: 'cfg-1',
    ticketTypeId: TICKET_TYPE_ID,
    concertId: CONCERT_ID,
    registrationOpensAt: new Date('2026-01-01T00:00:00Z'),
    registrationClosesAt: new Date('2026-01-10T00:00:00Z'),
    drawAt: new Date('2026-01-11T00:00:00Z'),
    allocation: 2,
    entitlementTtlMinutes: 15,
    status: 'SCHEDULED',
    seed: null,
    drawnAt: null,
    ...overrides,
  };
}

class FakeRepository implements PresaleLotteryRepositoryPort {
  config: LotteryConfigRecord | null = makeConfig();
  ticketType: TicketTypeLotteryInfo = makeTicketType();
  registrations: LotteryRegistrationRecord[] = [];
  activeEntitlementUnits = 0;
  committed: CommitDrawInput | null = null;
  lastCreateConfigInput: CreateLotteryConfigInput | null = null;

  async findTicketType() {
    return this.ticketType;
  }
  async findConfigByTicketType() {
    return this.config;
  }
  async createConfig(input: CreateLotteryConfigInput): Promise<LotteryConfigRecord> {
    this.lastCreateConfigInput = input;
    this.config = makeConfig({
      registrationOpensAt: input.registrationOpensAt,
      registrationClosesAt: input.registrationClosesAt,
      drawAt: input.drawAt,
      allocation: input.allocation,
      entitlementTtlMinutes: input.entitlementTtlMinutes,
      status: 'SCHEDULED',
      seed: null,
      drawnAt: null,
    });
    return this.config;
  }
  async updateConfigTtl(input: {
    entitlementTtlMinutes: number;
  }): Promise<LotteryConfigRecord | null> {
    this.config = this.config
      ? { ...this.config, entitlementTtlMinutes: input.entitlementTtlMinutes }
      : null;
    return this.config;
  }
  async cancelConfig(): Promise<LotteryConfigRecord | null> {
    throw new Error('not used');
  }
  async listRegistrations() {
    return [];
  }
  async countAlreadyReservedOrSoldByUser() {
    return 0;
  }
  async countReservedOrSoldByUsers(input: { userIds: string[] }) {
    return new Map(input.userIds.map((id) => [id, 0]));
  }
  async findActiveRegistration(input: { userId: string }) {
    return (
      this.registrations.find(
        (r) => r.userId === input.userId && r.status === 'REGISTERED',
      ) ?? null
    );
  }
  async createRegistration(
    input: CreateLotteryRegistrationInput,
  ): Promise<LotteryRegistrationRecord> {
    const record: LotteryRegistrationRecord = {
      id: `reg-${this.registrations.length + 1}`,
      userId: input.userId,
      concertId: input.concertId,
      ticketTypeId: input.ticketTypeId,
      desiredQuantity: input.desiredQuantity,
      status: 'REGISTERED',
      registeredAt: input.registeredAt,
      wonAt: null,
      notSelectedAt: null,
      withdrawnAt: null,
      fulfilledAt: null,
    };
    this.registrations.push(record);
    return record;
  }
  async withdrawRegistration(): Promise<LotteryRegistrationRecord | null> {
    throw new Error('not used');
  }
  async getStatus(): Promise<LotteryStatusRecord> {
    return { registration: null, config: null, entitlement: null };
  }
  async sumActiveEntitlementQuantity() {
    return this.activeEntitlementUnits;
  }
  async listRegisteredForDraw() {
    return this.registrations.filter((r) => r.status === 'REGISTERED');
  }
  async listDueDrawTicketTypeIds() {
    return this.config && this.config.status === 'SCHEDULED' ? [TICKET_TYPE_ID] : [];
  }
  async withConfigLock<T>(_ticketTypeId: string, work: () => Promise<T>): Promise<T> {
    return work();
  }
  async beginDraw(): Promise<LotteryConfigRecord | null> {
    if (!this.config || this.config.status !== 'SCHEDULED') return null;
    this.config = { ...this.config, status: 'DRAWING' };
    return this.config;
  }
  async commitDraw(input: CommitDrawInput): Promise<LotteryEntitlementRecord[]> {
    this.committed = input;
    this.config = this.config ? { ...this.config, status: 'COMPLETED', seed: input.seed } : null;
    return input.winners.map((w, index) => ({
      id: `ent-${index + 1}`,
      lotteryRegistrationId: w.registrationId,
      userId: w.userId,
      concertId: input.concertId,
      ticketTypeId: input.ticketTypeId,
      orderId: null,
      status: 'ACTIVE',
      quantity: w.quantity,
      grantedAt: input.now,
      expiresAt: new Date(input.now.getTime() + input.ttlMinutes * 60_000),
      consumedAt: null,
      revokedAt: null,
    }));
  }
  async listActiveEntitlementsExpiringSoon() {
    return [];
  }
  async expireEntitlements() {
    return 0;
  }
  async findEntitlementNotificationContext() {
    return null;
  }
  async findNotSelectedNotificationContext() {
    return null;
  }
}

class RecordingNotifier implements LotteryGrantNotifier {
  granted = 0;
  notSelected = 0;
  async notifyEntitlementGranted() {
    this.granted += 1;
  }
  async notifyEntitlementExpiringSoon() {
    /* noop */
  }
  async notifyNotSelected() {
    this.notSelected += 1;
  }
}

describe('RegisterForLotteryUseCase', () => {
  let repo: FakeRepository;

  beforeEach(() => {
    repo = new FakeRepository();
  });

  it('registers a user during the open window', async () => {
    const useCase = new RegisterForLotteryUseCase(repo);
    await useCase.execute({
      userId: 'u1',
      ticketTypeId: TICKET_TYPE_ID,
      desiredQuantity: 2,
      now: new Date('2026-01-05T00:00:00Z'),
    });
    expect(repo.registrations).toHaveLength(1);
    expect(repo.registrations[0].status).toBe('REGISTERED');
  });

  it('rejects registration outside the window', async () => {
    const useCase = new RegisterForLotteryUseCase(repo);
    await expect(
      useCase.execute({
        userId: 'u1',
        ticketTypeId: TICKET_TYPE_ID,
        desiredQuantity: 1,
        now: new Date('2026-01-20T00:00:00Z'),
      }),
    ).rejects.toBeInstanceOf(LotteryRegistrationWindowClosedError);
  });

  it('rejects desired quantity above per-user allowance', async () => {
    const useCase = new RegisterForLotteryUseCase(repo);
    await expect(
      useCase.execute({
        userId: 'u1',
        ticketTypeId: TICKET_TYPE_ID,
        desiredQuantity: 10,
        now: new Date('2026-01-05T00:00:00Z'),
      }),
    ).rejects.toBeInstanceOf(LotteryQuantityExceededError);
  });
});

describe('ConfigureLotteryUseCase', () => {
  let repo: FakeRepository;

  beforeEach(() => {
    repo = new FakeRepository();
  });

  it('defaults entitlement TTL to 15 minutes', async () => {
    const useCase = new ConfigureLotteryUseCase(repo);
    const config = await useCase.execute({
      ticketTypeId: TICKET_TYPE_ID,
      registrationOpensAt: new Date('2026-01-01T00:00:00Z'),
      registrationClosesAt: new Date('2026-01-10T00:00:00Z'),
      drawAt: new Date('2026-01-11T00:00:00Z'),
      publicSaleStartsAt: new Date('2026-01-12T00:00:00Z'),
      allocation: 2,
    });
    expect(config.entitlementTtlMinutes).toBe(15);
    expect(repo.lastCreateConfigInput?.saleStartsAt).toEqual(repo.ticketType.saleStartsAt);
  });

  it('rejects an invalid entitlement TTL', async () => {
    const useCase = new ConfigureLotteryUseCase(repo);
    await expect(
      useCase.execute({
        ticketTypeId: TICKET_TYPE_ID,
        registrationOpensAt: new Date('2026-01-01T00:00:00Z'),
        registrationClosesAt: new Date('2026-01-10T00:00:00Z'),
        drawAt: new Date('2026-01-11T00:00:00Z'),
        publicSaleStartsAt: new Date('2026-01-12T00:00:00Z'),
        allocation: 2,
        entitlementTtlMinutes: 0,
      }),
    ).rejects.toBeTruthy();
  });

  it('rejects config updates after the draw started or completed', async () => {
    const useCase = new ConfigureLotteryUseCase(repo);
    for (const status of ['DRAWING', 'COMPLETED'] as const) {
      repo.config = makeConfig({ status });
      await expect(
        useCase.execute({
          ticketTypeId: TICKET_TYPE_ID,
          registrationOpensAt: new Date('2026-01-01T00:00:00Z'),
          registrationClosesAt: new Date('2026-01-10T00:00:00Z'),
          drawAt: new Date('2026-01-11T00:00:00Z'),
          publicSaleStartsAt: new Date('2026-01-12T00:00:00Z'),
          allocation: 2,
          entitlementTtlMinutes: 20,
        }),
      ).rejects.toBeInstanceOf(LotteryConfigInvalidError);
    }
  });

  it('allows reconfiguring a cancelled lottery', async () => {
    repo.config = makeConfig({
      status: 'CANCELLED',
      seed: 'old-seed',
      drawnAt: new Date('2026-01-10T00:00:00Z'),
    });
    const useCase = new ConfigureLotteryUseCase(repo);
    const config = await useCase.execute({
      ticketTypeId: TICKET_TYPE_ID,
      registrationOpensAt: new Date('2026-01-02T00:00:00Z'),
      registrationClosesAt: new Date('2026-01-09T00:00:00Z'),
      drawAt: new Date('2026-01-10T00:00:00Z'),
      publicSaleStartsAt: new Date('2026-01-12T00:00:00Z'),
      allocation: 3,
      entitlementTtlMinutes: 20,
    });

    expect(config.status).toBe('SCHEDULED');
    expect(config.seed).toBeNull();
    expect(config.drawnAt).toBeNull();
    expect(config.entitlementTtlMinutes).toBe(20);
  });
});

describe('UpdateLotteryTtlUseCase', () => {
  let repo: FakeRepository;

  beforeEach(() => {
    repo = new FakeRepository();
  });

  it('updates TTL while scheduled', async () => {
    const useCase = new UpdateLotteryTtlUseCase(repo);
    const config = await useCase.execute({
      ticketTypeId: TICKET_TYPE_ID,
      entitlementTtlMinutes: 12,
    });
    expect(config.entitlementTtlMinutes).toBe(12);
  });

  it('rejects TTL update after completion', async () => {
    repo.config = makeConfig({ status: 'COMPLETED' });
    const useCase = new UpdateLotteryTtlUseCase(repo);
    await expect(
      useCase.execute({
        ticketTypeId: TICKET_TYPE_ID,
        entitlementTtlMinutes: 12,
      }),
    ).rejects.toBeInstanceOf(LotteryConfigInvalidError);
  });
});

describe('RunLotteryDrawUseCase', () => {
  let repo: FakeRepository;
  let notifier: RecordingNotifier;

  beforeEach(() => {
    repo = new FakeRepository();
    notifier = new RecordingNotifier();
    repo.registrations = [
      { ...makeRegistration('reg-1', 'u1') },
      { ...makeRegistration('reg-2', 'u2') },
      { ...makeRegistration('reg-3', 'u3') },
    ];
  });

  it('grants up to allocation and notifies winners + non-winners', async () => {
    repo.config = makeConfig({ entitlementTtlMinutes: 7 });
    const useCase = new RunLotteryDrawUseCase(repo, notifier);
    const result = await useCase.execute({
      ticketTypeId: TICKET_TYPE_ID,
      now: new Date('2026-01-11T00:00:00Z'),
    });

    expect(result.granted).toBe(2);
    expect(result.notSelected).toBe(1);
    expect(notifier.granted).toBe(2);
    expect(notifier.notSelected).toBe(1);
    expect(repo.config?.status).toBe('COMPLETED');
    expect(repo.committed?.ttlMinutes).toBe(7);
  });

  it('is idempotent when the config is already completed', async () => {
    repo.config = makeConfig({ status: 'COMPLETED' });
    const useCase = new RunLotteryDrawUseCase(repo, notifier);
    const result = await useCase.execute({ ticketTypeId: TICKET_TYPE_ID });
    expect(result.granted).toBe(0);
    expect(notifier.granted).toBe(0);
  });
});

function makeRegistration(id: string, userId: string): LotteryRegistrationRecord {
  return {
    id,
    userId,
    concertId: CONCERT_ID,
    ticketTypeId: TICKET_TYPE_ID,
    desiredQuantity: 1,
    status: 'REGISTERED',
    registeredAt: new Date('2026-01-05T00:00:00Z'),
    wonAt: null,
    notSelectedAt: null,
    withdrawnAt: null,
    fulfilledAt: null,
  };
}
