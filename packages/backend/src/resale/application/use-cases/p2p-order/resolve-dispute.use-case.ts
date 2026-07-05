import { Injectable, Inject, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { IResaleOrderRepository, RESALE_ORDER_REPOSITORY } from '../../../domain/ports/p2p-order/resale-order-repository.port';
import { ExecutePurchaseUseCase } from '../execute-purchase.use-case';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

export interface ResolveDisputeCommand {
  orderId: string;
  adminId: string;
  action: 'complete' | 'cancel';
  resolutionNote: string;
}

@Injectable()
export class ResolveDisputeUseCase {
  constructor(
    @Inject(RESALE_ORDER_REPOSITORY) private readonly orderRepo: IResaleOrderRepository,
    private readonly executePurchaseUseCase: ExecutePurchaseUseCase,
    @InjectQueue('compute-seller-trust') private trustQueue: Queue
  ) {}

  async execute(command: ResolveDisputeCommand) {
    const order = await this.orderRepo.findById(command.orderId);
    if (!order) {
      throw new BadRequestException('ORDER_NOT_FOUND');
    }

    if (order.status !== 'IN_DISPUTE') {
      throw new ConflictException('INVALID_ORDER_STATE');
    }

    if (command.action === 'complete') {
      // Buyer wins - execute transfer
      await this.executePurchaseUseCase.execute(order.buyerId, order.listingId);

      const updated = await this.orderRepo.resolveDispute(order.id, 'complete', command.resolutionNote);

      // Penalize seller
      await this.trustQueue.add('compute-trust', { 
        sellerId: order.sellerId,
        event: 'dispute_loss'
      });

      return updated;

    } else {
      // Seller wins - cancel order
      const updated = await this.orderRepo.resolveDispute(order.id, 'cancel', command.resolutionNote);
      return updated;
    }
  }
}
