import { Injectable, Inject, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { IResaleOrderRepository, RESALE_ORDER_REPOSITORY } from '../../../domain/ports/p2p-order/resale-order-repository.port';
import { PrismaService } from '../../../../platform/database/prisma.service';

export interface CancelP2POrderCommand {
  orderId: string;
  userId: string;
}

@Injectable()
export class CancelP2POrderUseCase {
  constructor(
    @Inject(RESALE_ORDER_REPOSITORY) private readonly orderRepo: IResaleOrderRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: CancelP2POrderCommand) {
    const order = await this.orderRepo.findById(command.orderId);
    if (!order) {
      throw new BadRequestException('ORDER_NOT_FOUND');
    }

    if (order.buyerId !== command.userId && order.sellerId !== command.userId) {
      throw new ForbiddenException('NOT_ORDER_PARTICIPANT');
    }

    if (order.status === 'PENDING_CONFIRM' && order.sellerId === command.userId) {
      throw new ConflictException('CANNOT_CANCEL_AFTER_PAYMENT_CONFIRMED');
    }

    if (order.status !== 'RESERVED') {
      throw new ConflictException('CANNOT_CANCEL_IN_CURRENT_STATE');
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.resaleOrder.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date()
        }
      });

      await tx.resaleListing.update({
        where: { id: order.listingId },
        data: {
          status: 'ACTIVE'
        }
      });

      // TODO: Notify the other party

      return updated;
    });
  }
}
