import {
  WaitlistEntryNotFoundError,
  WaitlistQuantityExceededError,
  WaitlistTicketTypeNotEligibleError,
  WaitlistTicketTypeNotFoundError,
} from '../../domain/errors';
import type { OfficialWaitlistRepositoryPort } from '../../domain/ports/official-waitlist-repository.port';
import type {
  PurchaseEntitlementRecord,
  WaitlistEntryRecord,
  WaitlistStatusRecord,
} from '../../domain/waitlist.types';

export interface JoinWaitlistCommand {
  userId: string;
  concertId: string;
  ticketTypeId: string;
  desiredQuantity: number;
  now?: Date;
}

export class JoinWaitlistUseCase {
  constructor(private readonly repository: OfficialWaitlistRepositoryPort) {}

  async execute(command: JoinWaitlistCommand): Promise<WaitlistStatusRecord> {
    const now = command.now ?? new Date();
    const ticketType = await this.repository.findTicketType(command.ticketTypeId);

    if (!ticketType || ticketType.concertId !== command.concertId) {
      throw new WaitlistTicketTypeNotFoundError(command.ticketTypeId);
    }

    const existing = await this.repository.findActiveEntry({
      userId: command.userId,
      ticketTypeId: command.ticketTypeId,
    });

    if (existing) {
      return this.repository.getStatus({
        userId: command.userId,
        concertId: command.concertId,
        ticketTypeId: command.ticketTypeId,
        now,
      });
    }

    const alreadyHeld = await this.repository.countAlreadyReservedOrSoldByUser({
      userId: command.userId,
      ticketTypeId: command.ticketTypeId,
    });
    const remainingAllowance = Math.max(ticketType.maxPerUser - alreadyHeld, 0);
    if (remainingAllowance <= 0 || command.desiredQuantity > remainingAllowance) {
      throw new WaitlistQuantityExceededError(command.desiredQuantity, remainingAllowance);
    }

    const available =
      ticketType.totalQuantity - ticketType.reservedQuantity - ticketType.soldQuantity;
    const gated = await this.repository.hasActiveGate(command.ticketTypeId);
    if (available > 0 && !gated) {
      throw new WaitlistTicketTypeNotEligibleError(command.ticketTypeId);
    }

    await this.repository.createEntry({
      userId: command.userId,
      concertId: command.concertId,
      ticketTypeId: command.ticketTypeId,
      desiredQuantity: command.desiredQuantity,
      joinedAt: now,
    });

    return this.repository.getStatus({
      userId: command.userId,
      concertId: command.concertId,
      ticketTypeId: command.ticketTypeId,
      now,
    });
  }
}

export class LeaveWaitlistUseCase {
  constructor(private readonly repository: OfficialWaitlistRepositoryPort) {}

  async execute(input: {
    userId: string;
    ticketTypeId: string;
    now?: Date;
  }): Promise<{
    entry: WaitlistEntryRecord | null;
    revokedEntitlementId: string | null;
  }> {
    const result = await this.repository.cancelEntryAndRevokeEntitlement({
      userId: input.userId,
      ticketTypeId: input.ticketTypeId,
      now: input.now ?? new Date(),
    });

    if (!result.entry) {
      throw new WaitlistEntryNotFoundError(input.ticketTypeId);
    }

    return result;
  }
}

export class GetWaitlistStatusUseCase {
  constructor(private readonly repository: OfficialWaitlistRepositoryPort) {}

  execute(input: {
    userId: string;
    concertId: string;
    ticketTypeId: string;
    now?: Date;
  }): Promise<WaitlistStatusRecord> {
    return this.repository.getStatus({
      userId: input.userId,
      concertId: input.concertId,
      ticketTypeId: input.ticketTypeId,
      now: input.now ?? new Date(),
    });
  }
}

export interface WaitlistGrantNotifier {
  notifyEntitlementGranted(entitlement: PurchaseEntitlementRecord): Promise<void>;
  notifyEntitlementExpiringSoon(entitlement: PurchaseEntitlementRecord): Promise<void>;
}

export class GrantWaitlistEntitlementsUseCase {
  constructor(
    private readonly repository: OfficialWaitlistRepositoryPort,
    private readonly notifier: WaitlistGrantNotifier,
    private readonly ttlMinutes: number,
  ) {}

  async execute(input: {
    ticketTypeId: string;
    releasedQuantity?: number;
    now?: Date;
  }): Promise<PurchaseEntitlementRecord[]> {
    const now = input.now ?? new Date();
    return this.repository.withTicketTypeLock(input.ticketTypeId, async () => {
      const ticketType = await this.repository.findTicketType(input.ticketTypeId);
      if (!ticketType) {
        return [];
      }

      const available =
        ticketType.totalQuantity -
        ticketType.reservedQuantity -
        ticketType.soldQuantity -
        (await this.repository.sumActiveEntitlementQuantity(input.ticketTypeId, now));
      let remainingToGrant = Math.max(
        Math.min(input.releasedQuantity ?? available, available),
        0,
      );
      if (remainingToGrant <= 0) {
        return [];
      }

      const entries = await this.repository.listNextWaitingEntries({
        ticketTypeId: input.ticketTypeId,
        limit: 50,
      });
      const granted: PurchaseEntitlementRecord[] = [];

      for (const entry of entries) {
        if (remainingToGrant <= 0) break;
        const alreadyHeld = await this.repository.countAlreadyReservedOrSoldByUser({
          userId: entry.userId,
          ticketTypeId: entry.ticketTypeId,
        });
        const remainingAllowance = Math.max(ticketType.maxPerUser - alreadyHeld, 0);
        const quantity = Math.min(
          entry.desiredQuantity,
          remainingAllowance,
          remainingToGrant,
        );
        if (quantity <= 0) continue;

        const entitlement = await this.repository.grantEntitlement({
          entryId: entry.id,
          userId: entry.userId,
          concertId: entry.concertId,
          ticketTypeId: entry.ticketTypeId,
          quantity,
          grantedAt: now,
          expiresAt: new Date(now.getTime() + this.ttlMinutes * 60 * 1000),
        });
        granted.push(entitlement);
        remainingToGrant -= quantity;

        try {
          await this.notifier.notifyEntitlementGranted(entitlement);
        } catch {
          // Notification failure is observable by logs/tests but must not roll back the grant.
        }
      }

      return granted;
    });
  }
}

export class ExpireWaitlistEntitlementsUseCase {
  constructor(
    private readonly repository: OfficialWaitlistRepositoryPort,
    private readonly grantUseCase: GrantWaitlistEntitlementsUseCase,
  ) {}

  async execute(input: { now?: Date } = {}): Promise<{
    expired: number;
    grantsTriggered: number;
  }> {
    const now = input.now ?? new Date();
    const expired = await this.repository.expireEntitlements(now);
    let grantsTriggered = 0;
    for (const item of expired) {
      await this.grantUseCase.execute({
        ticketTypeId: item.ticketTypeId,
        releasedQuantity: item.quantity,
        now,
      });
      grantsTriggered += 1;
    }
    return { expired: expired.length, grantsTriggered };
  }
}

export class SendWaitlistEntitlementRemindersUseCase {
  constructor(
    private readonly repository: OfficialWaitlistRepositoryPort,
    private readonly notifier: WaitlistGrantNotifier,
    private readonly reminderWindowMinutes: number,
  ) {}

  async execute(input: { now?: Date; limit?: number } = {}): Promise<{ enqueued: number }> {
    const now = input.now ?? new Date();
    const entitlements = await this.repository.listActiveEntitlementsExpiringSoon({
      now,
      reminderWindowEndsAt: new Date(
        now.getTime() + this.reminderWindowMinutes * 60 * 1000,
      ),
      limit: input.limit ?? 100,
    });
    let enqueued = 0;

    for (const entitlement of entitlements) {
      try {
        await this.notifier.notifyEntitlementExpiringSoon(entitlement);
        enqueued += 1;
      } catch {
        // Reminder failure must not block the expiry scan or waitlist grants.
      }
    }

    return { enqueued };
  }
}
