import {
  LotteryAllocationExceedsInventoryError,
  LotteryAlreadyDrawnError,
  LotteryConfigInvalidError,
  LotteryNotConfiguredError,
  LotteryQuantityExceededError,
  LotteryRegistrationNotFoundError,
  LotteryRegistrationWindowClosedError,
  LotteryTicketTypeNotFoundError,
} from '../../domain/errors';
import { selectWinners } from '../../domain/lottery-draw';
import type {
  LotteryConfigRecord,
  LotteryRegistrationRecord,
  LotteryStatusRecord,
} from '../../domain/lottery.types';
import type { PresaleLotteryRepositoryPort } from '../../domain/ports/presale-lottery-repository.port';

export interface LotteryDrawNotifier {
  notifyWinner(registrationId: string): Promise<void>;
  notifyNotSelected(registrationId: string): Promise<void>;
}

export interface ConfigureLotteryCommand {
  ticketTypeId: string;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  drawAt: Date;
  publicSaleStartsAt: Date;
  allocation: number;
}

export class ConfigureLotteryUseCase {
  constructor(private readonly repository: PresaleLotteryRepositoryPort) {}

  async execute(command: ConfigureLotteryCommand): Promise<LotteryConfigRecord> {
    const ticketType = await this.repository.findTicketType(command.ticketTypeId);
    if (!ticketType) {
      throw new LotteryTicketTypeNotFoundError(command.ticketTypeId);
    }
    const existingConfig = await this.repository.findConfigByTicketType(command.ticketTypeId);
    if (
      existingConfig &&
      (existingConfig.status === 'DRAWING' || existingConfig.status === 'COMPLETED')
    ) {
      throw new LotteryConfigInvalidError(
        'lottery config can only be updated while SCHEDULED or CANCELLED',
      );
    }

    if (command.allocation <= 0) {
      throw new LotteryConfigInvalidError('allocation must be positive');
    }
    if (!(command.registrationOpensAt < command.registrationClosesAt)) {
      throw new LotteryConfigInvalidError(
        'registrationOpensAt must be before registrationClosesAt',
      );
    }
    if (!(command.registrationClosesAt <= command.drawAt)) {
      throw new LotteryConfigInvalidError(
        'registrationClosesAt must be before or equal to drawAt',
      );
    }
    if (!(command.drawAt < command.publicSaleStartsAt)) {
      throw new LotteryConfigInvalidError('drawAt must be before publicSaleStartsAt');
    }
    if (!(ticketType.saleStartsAt <= command.drawAt)) {
      throw new LotteryConfigInvalidError(
        'ticket type sale must start on or before drawAt so winners can check out',
      );
    }

    const available =
      ticketType.totalQuantity - ticketType.reservedQuantity - ticketType.soldQuantity;
    if (command.allocation > available) {
      throw new LotteryAllocationExceedsInventoryError(command.allocation, available);
    }

    return this.repository.createConfig({
      ticketTypeId: command.ticketTypeId,
      concertId: ticketType.concertId,
      registrationOpensAt: command.registrationOpensAt,
      registrationClosesAt: command.registrationClosesAt,
      drawAt: command.drawAt,
      allocation: command.allocation,
      saleStartsAt: ticketType.saleStartsAt,
      publicSaleStartsAt: command.publicSaleStartsAt,
    });
  }
}

export class CancelLotteryUseCase {
  constructor(private readonly repository: PresaleLotteryRepositoryPort) {}

  async execute(input: { ticketTypeId: string; now?: Date }): Promise<LotteryConfigRecord> {
    const config = await this.repository.cancelConfig(
      input.ticketTypeId,
      input.now ?? new Date(),
    );
    if (!config) {
      throw new LotteryNotConfiguredError(input.ticketTypeId);
    }
    return config;
  }
}

export interface RegisterForLotteryCommand {
  userId: string;
  ticketTypeId: string;
  desiredQuantity: number;
  now?: Date;
}

export class RegisterForLotteryUseCase {
  constructor(private readonly repository: PresaleLotteryRepositoryPort) {}

  async execute(command: RegisterForLotteryCommand): Promise<LotteryStatusRecord> {
    const now = command.now ?? new Date();
    const config = await this.repository.findConfigByTicketType(command.ticketTypeId);
    if (!config) {
      throw new LotteryNotConfiguredError(command.ticketTypeId);
    }

    const existing = await this.repository.findActiveRegistration({
      userId: command.userId,
      ticketTypeId: command.ticketTypeId,
    });
    if (existing) {
      return this.repository.getStatus({
        userId: command.userId,
        ticketTypeId: command.ticketTypeId,
        now,
      });
    }

    if (
      config.status !== 'SCHEDULED' ||
      now < config.registrationOpensAt ||
      now >= config.registrationClosesAt
    ) {
      throw new LotteryRegistrationWindowClosedError(command.ticketTypeId);
    }

    const ticketType = await this.repository.findTicketType(command.ticketTypeId);
    if (!ticketType) {
      throw new LotteryTicketTypeNotFoundError(command.ticketTypeId);
    }

    const alreadyHeld = await this.repository.countAlreadyReservedOrSoldByUser({
      userId: command.userId,
      ticketTypeId: command.ticketTypeId,
    });
    const remainingAllowance = Math.max(ticketType.maxPerUser - alreadyHeld, 0);
    if (remainingAllowance <= 0 || command.desiredQuantity > remainingAllowance) {
      throw new LotteryQuantityExceededError(command.desiredQuantity, remainingAllowance);
    }

    await this.repository.createRegistration({
      userId: command.userId,
      concertId: config.concertId,
      ticketTypeId: command.ticketTypeId,
      desiredQuantity: command.desiredQuantity,
      registeredAt: now,
    });

    return this.repository.getStatus({
      userId: command.userId,
      ticketTypeId: command.ticketTypeId,
      now,
    });
  }
}

export class WithdrawLotteryRegistrationUseCase {
  constructor(private readonly repository: PresaleLotteryRepositoryPort) {}

  async execute(input: {
    userId: string;
    ticketTypeId: string;
    now?: Date;
  }): Promise<LotteryRegistrationRecord> {
    const now = input.now ?? new Date();
    const config = await this.repository.findConfigByTicketType(input.ticketTypeId);
    if (config && config.status !== 'SCHEDULED') {
      throw new LotteryAlreadyDrawnError(input.ticketTypeId);
    }

    const registration = await this.repository.withdrawRegistration({
      userId: input.userId,
      ticketTypeId: input.ticketTypeId,
      now,
    });
    if (!registration) {
      throw new LotteryRegistrationNotFoundError(input.ticketTypeId);
    }
    return registration;
  }
}

export class GetLotteryStatusUseCase {
  constructor(private readonly repository: PresaleLotteryRepositoryPort) {}

  execute(input: {
    userId: string;
    ticketTypeId: string;
    now?: Date;
  }): Promise<LotteryStatusRecord> {
    return this.repository.getStatus({
      userId: input.userId,
      ticketTypeId: input.ticketTypeId,
      now: input.now ?? new Date(),
    });
  }
}

export class GetLotteryConfigUseCase {
  constructor(private readonly repository: PresaleLotteryRepositoryPort) {}

  async execute(input: { ticketTypeId: string }): Promise<LotteryConfigRecord> {
    const config = await this.repository.findConfigByTicketType(input.ticketTypeId);
    if (!config) {
      throw new LotteryNotConfiguredError(input.ticketTypeId);
    }
    return config;
  }
}

export class ListLotteryRegistrationsUseCase {
  constructor(private readonly repository: PresaleLotteryRepositoryPort) {}

  async execute(input: { ticketTypeId: string }) {
    const config = await this.repository.findConfigByTicketType(input.ticketTypeId);
    if (!config) {
      throw new LotteryNotConfiguredError(input.ticketTypeId);
    }
    return this.repository.listRegistrations(input.ticketTypeId);
  }
}

export class RunLotteryDrawUseCase {
  constructor(
    private readonly repository: PresaleLotteryRepositoryPort,
    private readonly notifier: LotteryDrawNotifier,
  ) {}

  async execute(input: {
    ticketTypeId: string;
    now?: Date;
  }): Promise<{ granted: number; notSelected: number }> {
    const now = input.now ?? new Date();

    const result = await this.repository.withConfigLock(input.ticketTypeId, async () => {
      const config = await this.repository.beginDraw(input.ticketTypeId);
      if (!config) {
        // Not SCHEDULED (already drawing/completed/cancelled) — idempotent no-op.
        return null;
      }

      const ticketType = await this.repository.findTicketType(input.ticketTypeId);
      if (!ticketType) {
        return null;
      }

      const registrations = await this.repository.listRegisteredForDraw(input.ticketTypeId);
      // Winners buy from the public pool during the presale window; award at most the
      // configured allocation, bounded by currently-available primary inventory.
      const available =
        ticketType.totalQuantity - ticketType.reservedQuantity - ticketType.soldQuantity;
      const grantableUnits = Math.max(Math.min(config.allocation, available), 0);

      const seed = config.seed ?? this.deriveSeed(config);
      const allowanceByUser = await this.repository.countReservedOrSoldByUsers({
        ticketTypeId: input.ticketTypeId,
        userIds: [...new Set(registrations.map((r) => r.userId))],
      });
      const remainingAllowanceByUser = new Map<string, number>();
      for (const registration of registrations) {
        const held = allowanceByUser.get(registration.userId) ?? 0;
        remainingAllowanceByUser.set(
          registration.userId,
          Math.max(ticketType.maxPerUser - held, 0),
        );
      }

      const selection = selectWinners({
        seed,
        registrations,
        grantableUnits,
        maxPerUser: ticketType.maxPerUser,
        remainingAllowanceByUser,
      });

      const winnerRegistrationIds = await this.repository.commitDraw({
        configId: config.id,
        ticketTypeId: input.ticketTypeId,
        concertId: ticketType.concertId,
        seed,
        registrantCount: registrations.length,
        winners: selection.winners,
        notSelectedRegistrationIds: selection.notSelectedRegistrationIds,
        allocationConsumed: selection.allocationConsumed,
        now,
      });

      return {
        winnerRegistrationIds,
        notSelectedRegistrationIds: selection.notSelectedRegistrationIds,
      };
    });

    if (!result) {
      return { granted: 0, notSelected: 0 };
    }

    for (const registrationId of result.winnerRegistrationIds) {
      try {
        await this.notifier.notifyWinner(registrationId);
      } catch {
        // Notification failure must not roll back the completed draw.
      }
    }
    for (const registrationId of result.notSelectedRegistrationIds) {
      try {
        await this.notifier.notifyNotSelected(registrationId);
      } catch {
        // Non-winner notification failure must not roll back the draw.
      }
    }

    return {
      granted: result.winnerRegistrationIds.length,
      notSelected: result.notSelectedRegistrationIds.length,
    };
  }

  private deriveSeed(config: LotteryConfigRecord): string {
    return `${config.id}:${config.drawAt.getTime()}`;
  }
}

export class RunDueLotteryDrawsUseCase {
  constructor(
    private readonly repository: PresaleLotteryRepositoryPort,
    private readonly runDraw: RunLotteryDrawUseCase,
  ) {}

  async execute(input: { now?: Date } = {}): Promise<{ drawsRun: number; granted: number }> {
    const now = input.now ?? new Date();
    const ticketTypeIds = await this.repository.listDueDrawTicketTypeIds(now);
    let drawsRun = 0;
    let granted = 0;
    for (const ticketTypeId of ticketTypeIds) {
      const result = await this.runDraw.execute({ ticketTypeId, now });
      if (result.granted > 0 || result.notSelected > 0) {
        drawsRun += 1;
      }
      granted += result.granted;
    }
    return { drawsRun, granted };
  }
}

