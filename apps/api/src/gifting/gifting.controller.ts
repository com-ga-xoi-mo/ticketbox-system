import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { InitiateTransferUseCase } from '@ticketbox/backend/gifting/application/use-cases/initiate-transfer.usecase';
import { CancelTransferUseCase } from '@ticketbox/backend/gifting/application/use-cases/cancel-transfer.usecase';
import { JwtAuthGuard } from '@ticketbox/backend/identity/infrastructure/passport/jwt-auth.guard';
import { IsEmail } from 'class-validator';

class InitiateTransferDto {
  @IsEmail()
  recipientEmail!: string;
}

@Controller('me')
@UseGuards(JwtAuthGuard)
export class GiftingController {
  constructor(
    private readonly initiateTransferUseCase: InitiateTransferUseCase,
    private readonly cancelTransferUseCase: CancelTransferUseCase,
  ) {}

  @Post('tickets/:id/transfer')
  @HttpCode(201)
  async initiateTransfer(
    @Param('id') ticketId: string,
    @Body() body: InitiateTransferDto,
    @Request() req: any,
  ) {
    return this.initiateTransferUseCase.execute({
      ticketId,
      senderId: req.user.id,
      recipientEmail: body.recipientEmail,
    });
  }

  @Delete('tickets/:id/transfer')
  async cancelTransfer(@Param('id') ticketId: string, @Request() req: any) {
    return this.cancelTransferUseCase.execute(ticketId, req.user.id);
  }

  @Get('transfers/outgoing')
  async listOutgoingTransfers(@Request() req: any) {
    // TODO: integrate ListOutgoingTransfersUseCase
    return [];
  }

  @Get('transfers/incoming')
  async listIncomingTransfers(@Request() req: any) {
    // TODO: integrate ListIncomingTransfersUseCase
    return [];
  }
}
