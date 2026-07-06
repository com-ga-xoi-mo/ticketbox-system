import { Controller, Post, Get, Param } from '@nestjs/common';
import { AcceptTransferUseCase } from '@ticketbox/backend/gifting/application/use-cases/accept-transfer.usecase';
import { DeclineTransferUseCase } from '@ticketbox/backend/gifting/application/use-cases/decline-transfer.usecase';

@Controller('transfers')
export class PublicTransferController {
  constructor(
    private readonly acceptTransferUseCase: AcceptTransferUseCase,
    private readonly declineTransferUseCase: DeclineTransferUseCase,
  ) {}

  @Post(':token/accept')
  async acceptTransfer(@Param('token') token: string) {
    return this.acceptTransferUseCase.execute(token);
  }

  @Post(':token/decline')
  async declineTransfer(@Param('token') token: string) {
    return this.declineTransferUseCase.execute(token);
  }

  @Get(':token')
  async getTransfer(@Param('token') token: string) {
    // TODO: implement GetTransferDetailUseCase
    return {};
  }
}
