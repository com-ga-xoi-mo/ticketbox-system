import {
  WaitlistEntryNotFoundError,
  WaitlistQuantityExceededError,
  WaitlistTicketTypeNotEligibleError,
  WaitlistTicketTypeNotFoundError,
} from '../../domain/errors';
import type { OfficialWaitlistRepositoryPort } from '../../domain/ports/official-waitlist-repository.port';
import type {
  WaitlistRecoveryNotificationContext,
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
    if (available > 0) {
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
  }> {
    const entry = await this.repository.cancelEntry({
      userId: input.userId,
      ticketTypeId: input.ticketTypeId,
      now: input.now ?? new Date(),
    });

    if (!entry) {
      throw new WaitlistEntryNotFoundError(input.ticketTypeId);
    }

    return { entry };
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
  notifyAvailabilityRecovered(
    context: WaitlistRecoveryNotificationContext,
    notifiedAt: Date,
  ): Promise<void>;
}

export class WatchWaitlistAvailabilityUseCase {
  constructor(
    private readonly repository: OfficialWaitlistRepositoryPort,
    private readonly notifier: WaitlistGrantNotifier,
  ) {}

  async execute(input: { now?: Date; limit?: number } = {}): Promise<{
    scanned: number;
    notifiedTicketTypes: number;
    notifications: number;
  }> {
    const now = input.now ?? new Date();
    const ticketTypeIds = await this.repository.listTicketTypesWithActiveSubscribers(
      input.limit ?? 500,
    );
    let notifiedTicketTypes = 0;
    let notifications = 0;

    for (const ticketTypeId of ticketTypeIds) {
      const result = await this.repository.withTicketTypeLock(ticketTypeId, async () => {
        const ticketType = await this.repository.findTicketType(ticketTypeId);
        if (!ticketType) return 0;

        const available =
          ticketType.totalQuantity - ticketType.reservedQuantity - ticketType.soldQuantity;
        const marker = await this.repository.getOrCreateAvailabilityMarker(ticketTypeId);

        if (available <= 0) {
          if (marker.markerState !== 'SOLD_OUT') {
            await this.repository.updateAvailabilityMarker({
              ticketTypeId,
              markerState: 'SOLD_OUT',
            });
          }
          return 0;
        }

        if (marker.markerState !== 'SOLD_OUT') {
          if (marker.markerState === 'AVAILABLE') {
            await this.repository.updateAvailabilityMarker({
              ticketTypeId,
              markerState: 'AVAILABLE',
            });
          }
          return 0;
        }

        const contexts = await this.repository.listActiveSubscriberNotificationContexts({
          ticketTypeId,
        });
        for (const context of contexts) {
          try {
            await this.notifier.notifyAvailabilityRecovered(context, now);
          } catch {
            // Notification failures must not block marker progression or other subscribers.
          }
        }
        await this.repository.updateAvailabilityMarker({
          ticketTypeId,
          markerState: 'NOTIFIED',
          lastNotifiedAt: now,
        });
        return contexts.length;
      });
      if (result > 0) {
        notifiedTicketTypes += 1;
        notifications += result;
      }
    }

    return { scanned: ticketTypeIds.length, notifiedTicketTypes, notifications };
  }
}
