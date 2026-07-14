import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigureLotteryRequestSchema } from '@ticketbox/api-types';

import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { Role } from '../../../identity/domain/role.enum';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import {
  CancelLotteryUseCase,
  ConfigureLotteryUseCase,
  GetLotteryConfigUseCase,
  ListLotteryRegistrationsUseCase,
  RunLotteryDrawUseCase,
} from '../../application/use-cases/lottery.use-cases';
import {
  LotteryAllocationExceedsInventoryError,
  LotteryConfigInvalidError,
  LotteryNotConfiguredError,
  LotteryTicketTypeNotFoundError,
} from '../../domain/errors';
import { serializeConfig, serializeRegistrationList } from './lottery.presenter';

@Controller('organizer/lottery')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER, Role.ADMIN)
export class OrganizerLotteryController {
  constructor(
    private readonly configureLottery: ConfigureLotteryUseCase,
    private readonly cancelLottery: CancelLotteryUseCase,
    private readonly getLotteryConfig: GetLotteryConfigUseCase,
    private readonly runLotteryDraw: RunLotteryDrawUseCase,
    private readonly listLotteryRegistrations: ListLotteryRegistrationsUseCase,
  ) {}

  @Post()
  async configure(@Body() body: unknown) {
    const dto = ConfigureLotteryRequestSchema.parse(body);
    try {
      const config = await this.configureLottery.execute({
        ticketTypeId: dto.ticketTypeId,
        registrationOpensAt: new Date(dto.registrationOpensAt),
        registrationClosesAt: new Date(dto.registrationClosesAt),
        drawAt: new Date(dto.drawAt),
        publicSaleStartsAt: new Date(dto.publicSaleStartsAt),
        allocation: dto.allocation,
      });
      return serializeConfig(config);
    } catch (error: unknown) {
      return this.mapError(error);
    }
  }

  @Get(':ticketTypeId')
  async status(@Param('ticketTypeId') ticketTypeId: string) {
    try {
      const config = await this.getLotteryConfig.execute({ ticketTypeId });
      return serializeConfig(config);
    } catch (error: unknown) {
      return this.mapError(error);
    }
  }

  @Get(':ticketTypeId/registrations')
  async registrations(@Param('ticketTypeId') ticketTypeId: string) {
    try {
      const registrations = await this.listLotteryRegistrations.execute({ ticketTypeId });
      return serializeRegistrationList(ticketTypeId, registrations);
    } catch (error: unknown) {
      return this.mapError(error);
    }
  }

  @Post(':ticketTypeId/draw-now')
  async drawNow(@Param('ticketTypeId') ticketTypeId: string) {
    try {
      const result = await this.runLotteryDraw.execute({ ticketTypeId });
      return { ticketTypeId, ...result };
    } catch (error: unknown) {
      return this.mapError(error);
    }
  }

  @Delete(':ticketTypeId')
  async cancel(@Param('ticketTypeId') ticketTypeId: string) {
    try {
      const config = await this.cancelLottery.execute({ ticketTypeId });
      return serializeConfig(config);
    } catch (error: unknown) {
      return this.mapError(error);
    }
  }

  private mapError(error: unknown): never {
    if (
      error instanceof LotteryTicketTypeNotFoundError ||
      error instanceof LotteryNotConfiguredError
    ) {
      throw new NotFoundException(error.message);
    }
    if (
      error instanceof LotteryConfigInvalidError ||
      error instanceof LotteryAllocationExceedsInventoryError
    ) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
