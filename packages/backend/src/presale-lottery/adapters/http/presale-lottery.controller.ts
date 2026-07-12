import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RegisterForLotteryRequestSchema } from '@ticketbox/api-types';

import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { Role } from '../../../identity/domain/role.enum';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import {
  GetLotteryStatusUseCase,
  RegisterForLotteryUseCase,
  WithdrawLotteryRegistrationUseCase,
} from '../../application/use-cases/lottery.use-cases';
import {
  LotteryAllocationExceedsInventoryError,
  LotteryAlreadyDrawnError,
  LotteryConfigInvalidError,
  LotteryNotConfiguredError,
  LotteryQuantityExceededError,
  LotteryRegistrationNotFoundError,
  LotteryRegistrationWindowClosedError,
  LotteryTicketTypeNotFoundError,
} from '../../domain/errors';
import { serializeLotteryStatus, serializeWithdraw } from './lottery.presenter';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AUDIENCE)
export class PresaleLotteryController {
  constructor(
    private readonly registerForLottery: RegisterForLotteryUseCase,
    private readonly withdrawRegistration: WithdrawLotteryRegistrationUseCase,
    private readonly getLotteryStatus: GetLotteryStatusUseCase,
  ) {}

  @Post('me/lottery')
  async register(@Body() body: unknown, @Request() req: { user: AuthenticatedUser }) {
    const dto = RegisterForLotteryRequestSchema.parse(body);
    try {
      const status = await this.registerForLottery.execute({
        userId: req.user.id,
        ticketTypeId: dto.ticketTypeId,
        desiredQuantity: dto.desiredQuantity,
      });
      return serializeLotteryStatus(status, dto.ticketTypeId);
    } catch (error: unknown) {
      return this.mapError(error);
    }
  }

  @Get('me/lottery/status')
  async status(
    @Query('ticketTypeId') ticketTypeId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    const status = await this.getLotteryStatus.execute({
      userId: req.user.id,
      ticketTypeId,
    });
    return serializeLotteryStatus(status, ticketTypeId);
  }

  @Delete('me/lottery/:ticketTypeId')
  async withdraw(
    @Param('ticketTypeId') ticketTypeId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    try {
      const registration = await this.withdrawRegistration.execute({
        userId: req.user.id,
        ticketTypeId,
      });
      return serializeWithdraw(registration);
    } catch (error: unknown) {
      return this.mapError(error);
    }
  }

  private mapError(error: unknown): never {
    if (
      error instanceof LotteryTicketTypeNotFoundError ||
      error instanceof LotteryNotConfiguredError ||
      error instanceof LotteryRegistrationNotFoundError
    ) {
      throw new NotFoundException(error.message);
    }
    if (
      error instanceof LotteryRegistrationWindowClosedError ||
      error instanceof LotteryQuantityExceededError ||
      error instanceof LotteryAlreadyDrawnError ||
      error instanceof LotteryConfigInvalidError ||
      error instanceof LotteryAllocationExceedsInventoryError
    ) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
