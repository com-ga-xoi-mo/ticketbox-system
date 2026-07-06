import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import {
  ITicketTransferRepository,
  TICKET_TRANSFER_REPOSITORY,
} from '../../domain/ports/ticket-transfer-repository.port';
import { PrismaService } from '../../../platform/database/prisma.service';
import { createHash } from 'crypto';

@Injectable()
export class DeclineTransferUseCase {
  constructor(
    @Inject(TICKET_TRANSFER_REPOSITORY)
    private readonly transferRepo: ITicketTransferRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(token: string) {
    // TODO: implement logic:
    // 1. Hash token, find transfer
    // 2. Transaction: transfer.status = DECLINED, ticket.status = ISSUED
    return { success: true };
  }
}
