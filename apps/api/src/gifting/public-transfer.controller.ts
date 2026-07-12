import { Controller, Post, Get, Param, HttpException, HttpStatus, HttpCode } from '@nestjs/common';
import { AcceptTransferUseCase } from '@ticketbox/backend/gifting/application/use-cases/accept-transfer.usecase';
import { DeclineTransferUseCase } from '@ticketbox/backend/gifting/application/use-cases/decline-transfer.usecase';
import { PrismaService } from '@ticketbox/backend/platform/database/prisma.service';
import { createHash } from 'crypto';

@Controller('transfers')
export class PublicTransferController {
  constructor(
    private readonly acceptTransferUseCase: AcceptTransferUseCase,
    private readonly declineTransferUseCase: DeclineTransferUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':token/accept')
  @HttpCode(200)
  async acceptTransfer(@Param('token') token: string) {
    return this.acceptTransferUseCase.execute(token);
  }

  @Post(':token/decline')
  @HttpCode(200)
  async declineTransfer(@Param('token') token: string) {
    return this.declineTransferUseCase.execute(token);
  }

  @Get(':token')
  async getTransfer(@Param('token') token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const transfer = await this.prisma.ticketTransfer.findUnique({
      where: { tokenHash },
      include: { ticket: { include: { concert: true, ticketType: true } }, sender: true },
    });

    if (!transfer) {
      throw new HttpException('NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    if (transfer.status === 'EXPIRED' || transfer.expiresAt < new Date()) {
      throw new HttpException('EXPIRED', HttpStatus.GONE);
    }

    if (transfer.status !== 'PENDING') {
      throw new HttpException('RESOLVED', HttpStatus.CONFLICT);
    }

    return {
      senderName: transfer.sender.displayName || transfer.sender.email,
      concertName: transfer.ticket.concert.title,
      ticketType: transfer.ticket.ticketType.name,
      status: transfer.status,
    };
  }
}
