import { Injectable, Inject, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { IResaleOrderRepository, RESALE_ORDER_REPOSITORY } from '../../../domain/ports/p2p-order/resale-order-repository.port';

export interface RaiseDisputeCommand {
  orderId: string;
  userId: string;
  reason: string;
}

@Injectable()
export class RaiseDisputeUseCase {
  constructor(
    @Inject(RESALE_ORDER_REPOSITORY) private readonly orderRepo: IResaleOrderRepository,
  ) {}

  async execute(command: RaiseDisputeCommand) {
    const order = await this.orderRepo.findById(command.orderId);
    if (!order) {
      throw new BadRequestException('ORDER_NOT_FOUND');
    }

    if (order.buyerId !== command.userId && order.sellerId !== command.userId && command.userId !== 'SYSTEM') {
      throw new ForbiddenException('NOT_ORDER_PARTICIPANT');
    }

    if (order.status !== 'PENDING_CONFIRM') {
      throw new ConflictException('DISPUTE_NOT_ALLOWED_IN_CURRENT_STATE');
    }

    const updated = await this.orderRepo.updateStatus(order.id, 'IN_DISPUTE', {
      disputeReason: command.reason,
      disputeRaisedBy: command.userId === 'SYSTEM' ? null : command.userId,
      disputedAt: new Date()
    });

    // TODO: Notify admin (queue notification job)

    return updated;
  }
}
