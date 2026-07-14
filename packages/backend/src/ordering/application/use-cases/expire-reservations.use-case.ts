import { OrderStatus } from '../../domain/order-status.enum';
import {
  OrderConflictError,
  PaidOrderExpirationSkippedError,
} from '../../domain/errors';
import type { IExpiredOrderRepository } from '../../domain/ports/expired-order-repository.port';
import type { TransitionOrderStatusUseCase } from './transition-order-status.use-case';

export interface ExpireReservationsCommand {
  now?: Date;
  limit?: number;
}

export interface ExpireReservationsResult {
  scanned: number;
  expired: number;
  skippedPaid: number;
  conflicted: number;
  failed: number;
}

export class ExpireReservationsUseCase {
  constructor(
    private readonly expiredOrderRepository: IExpiredOrderRepository,
    private readonly transitionOrderStatusUseCase: TransitionOrderStatusUseCase,
  ) {}

  async execute(command: ExpireReservationsCommand = {}): Promise<ExpireReservationsResult> {
    const now = command.now ?? new Date();
    const limit = command.limit ?? 100;
    const orderIds = await this.expiredOrderRepository.findExpiredPendingOrderIds(
      now,
      limit,
    );

    let expired = 0;
    let skippedPaid = 0;
    let conflicted = 0;
    let failed = 0;

    for (const orderId of orderIds) {
      try {
        await this.transitionOrderStatusUseCase.execute({
          orderId,
          status: OrderStatus.EXPIRED,
          skipOwnershipCheck: true,
          occurredAt: now,
        });
        expired += 1;
      } catch (error: unknown) {
        if (error instanceof PaidOrderExpirationSkippedError) {
          skippedPaid += 1;
        } else if (error instanceof OrderConflictError) {
          conflicted += 1;
        } else {
          failed += 1;
        }
      }
    }

    return {
      scanned: orderIds.length,
      expired,
      skippedPaid,
      conflicted,
      failed,
    };
  }
}
