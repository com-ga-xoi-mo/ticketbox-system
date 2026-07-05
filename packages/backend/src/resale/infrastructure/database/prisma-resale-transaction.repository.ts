import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service';
import { IResaleTransactionRepository } from '../../domain/ports/resale-transaction-repository.port';

@Injectable()
export class PrismaResaleTransactionRepository implements IResaleTransactionRepository {
  constructor(private readonly db: PrismaService) {}

  async findTransactionsBySeller(sellerId: string) {
    return this.db.resaleTransaction.findMany({
      where: { sellerId },
      include: {
        listing: { include: { concert: true, ticketType: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async markPayoutProcessed(transactionId: string) {
    const tx = await this.db.resaleTransaction.findUnique({ where: { id: transactionId } });
    if (!tx) throw new NotFoundException('Transaction not found');
    await this.db.resaleTransaction.update({
      where: { id: transactionId },
      data: { payoutStatus: 'PROCESSED', payoutProcessedAt: new Date() }
    });
  }
}
