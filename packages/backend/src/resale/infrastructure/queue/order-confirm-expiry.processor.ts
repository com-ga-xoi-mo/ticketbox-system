import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { RaiseDisputeUseCase } from '../../application/use-cases/p2p-order/raise-dispute.use-case';
import { PrismaService } from '../../../platform/database/prisma.service';

@Processor('resale.order.confirm.expiry')
@Injectable()
export class ResaleOrderConfirmExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(ResaleOrderConfirmExpiryProcessor.name);

  constructor(
    private readonly raiseDisputeUseCase: RaiseDisputeUseCase,
    private readonly prisma: PrismaService
  ) {
    super();
  }

  async process(job: Job<{ orderId: string }>) {
    const { orderId } = job.data;
    
    const order = await this.prisma.resaleOrder.findUnique({ where: { id: orderId } });
    if (!order) return;

    if (order.status === 'PENDING_CONFIRM') {
      this.logger.log(`Order ${orderId} expired in PENDING_CONFIRM state, escalating to dispute...`);
      try {
        await this.raiseDisputeUseCase.execute({
          orderId,
          userId: 'SYSTEM',
          reason: 'SELLER_NO_RESPONSE'
        });
      } catch (err) {
        this.logger.error(`Failed to escalate order ${orderId} to dispute`, err);
        throw err;
      }
    }
  }
}
