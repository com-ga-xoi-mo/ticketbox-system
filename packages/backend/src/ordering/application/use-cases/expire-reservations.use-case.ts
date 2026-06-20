import { OrderStatus } from '../../domain/order-status.enum';
import type { IExpiredOrderRepository } from '../../domain/ports/expired-order-repository.port';
import type { TransitionOrderStatusUseCase } from './transition-order-status.use-case';

export interface ExpireReservationsCommand {
  now?: Date;
  limit?: number;
}

export interface ExpireReservationsResult {
  scanned: number;
  expired: number;
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
      } catch {
        failed += 1;
      }
    }

    return {
      scanned: orderIds.length,
      expired,
      failed,
    };
  }
}
