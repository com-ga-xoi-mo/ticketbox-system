import { Injectable, Inject, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { IResaleOrderRepository, RESALE_ORDER_REPOSITORY } from '../../../domain/ports/p2p-order/resale-order-repository.port';
import { ExecutePurchaseUseCase } from '../execute-purchase.use-case';
import { PrismaService } from '../../../../platform/database/prisma.service';
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
    private readonly prisma: PrismaService,
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

      const updated = await this.orderRepo.updateStatus(order.id, 'COMPLETED', {
        resolvedBy: command.adminId,
        resolutionNote: command.resolutionNote,
        resolvedAt: new Date(),
        completedAt: new Date()
      });

      // Penalize seller
      await this.trustQueue.add('compute-trust', { 
        sellerId: order.sellerId,
        event: 'dispute_loss'
      });

      return updated;

    } else {
      // Seller wins - cancel order
      return this.prisma.$transaction(async (tx: any) => {
        const updated = await tx.resaleOrder.update({
          where: { id: order.id },
          data: {
            status: 'CANCELLED',
            resolvedBy: command.adminId,
            resolutionNote: command.resolutionNote,
            resolvedAt: new Date(),
            cancelledAt: new Date()
          }
        });

        await tx.resaleListing.update({
          where: { id: order.listingId },
          data: { status: 'ACTIVE' }
        });

        // Increment buyer violations
        const buyer = await tx.user.update({
          where: { id: order.buyerId },
          data: { buyerViolationCount: { increment: 1 } }
        });

        if (buyer.buyerViolationCount >= 3) {
          await tx.user.update({
            where: { id: order.buyerId },
            data: { resaleMarketSuspendedAt: new Date() }
          });
        }

        return updated;
      });
    }
  }
}
