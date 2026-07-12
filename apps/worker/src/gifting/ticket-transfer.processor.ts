import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '@ticketbox/backend/platform/database/prisma.service';
import { Logger } from '@nestjs/common';

@Processor('ticket-transfer')
export class TicketTransferExpireProcessor extends WorkerHost {
  private readonly logger = new Logger(TicketTransferExpireProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ transferId: string }>): Promise<void> {
    this.logger.log(`Processing expiry for transfer ${job.data.transferId}`);
    // TODO: implement logic:
    // 1. Find transfer by id
    // 2. Skip if status != PENDING
    // 3. Atomically set transfer.status = EXPIRED, ticket.status = ISSUED
  }
}
