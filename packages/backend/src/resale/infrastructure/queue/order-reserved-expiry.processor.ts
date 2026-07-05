import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { CancelP2POrderUseCase } from '../../application/use-cases/p2p-order/cancel-p2p-order.use-case';
import { PrismaService } from '../../../platform/database/prisma.service';

@Processor('resale.order.reserved.expiry')
@Injectable()
export class ResaleOrderReservedExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(ResaleOrderReservedExpiryProcessor.name);

  constructor(
    private readonly cancelUseCase: CancelP2POrderUseCase,
    private readonly prisma: PrismaService
  ) {
    super();
  }

  async process(job: Job<{ orderId: string }>) {
    const { orderId } = job.data;
    
    // Check if order is still RESERVED
    const order = await this.prisma.resaleOrder.findUnique({ where: { id: orderId } });
    if (!order) return;

    if (order.status === 'RESERVED') {
      this.logger.log(`Order ${orderId} expired in RESERVED state, cancelling...`);
      try {
        await this.cancelUseCase.execute({
          orderId,
          userId: order.buyerId // Act as buyer cancelling it
        });
      } catch (err) {
        this.logger.error(`Failed to cancel expired order ${orderId}`, err);
        throw err;
      }
    }
  }
}
