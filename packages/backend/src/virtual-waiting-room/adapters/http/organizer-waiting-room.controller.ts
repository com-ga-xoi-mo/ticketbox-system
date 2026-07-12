import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ConfigureWaitingRoomRequestSchema,
  SetWaitingRoomOverrideRequestSchema,
} from '@ticketbox/api-types';

import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { Role } from '../../../identity/domain/role.enum';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { ConfigureWaitingRoomUseCase } from '../../application/use-cases/configure-waiting-room.use-case';
import { GetWaitingRoomConfigUseCase } from '../../application/use-cases/get-waiting-room-config.use-case';
import { SetWaitingRoomOverrideUseCase } from '../../application/use-cases/set-waiting-room-override.use-case';
import {
  WaitingRoomConcertNotFoundError,
  WaitingRoomInvalidConfigError,
} from '../../domain/errors';
import { serializeWaitingRoomConfig } from './waiting-room.presenter';

@Controller('organizer/waiting-room/:concertId')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER, Role.ADMIN)
export class OrganizerWaitingRoomController {
  constructor(
    private readonly configureWaitingRoom: ConfigureWaitingRoomUseCase,
    private readonly getWaitingRoomConfig: GetWaitingRoomConfigUseCase,
    private readonly setWaitingRoomOverride: SetWaitingRoomOverrideUseCase,
  ) {}

  @Get()
  async get(@Param('concertId') concertId: string) {
    const config = await this.getWaitingRoomConfig.execute(concertId);
    if (!config) {
      throw new NotFoundException('Waiting room config not found');
    }
    return serializeWaitingRoomConfig(config);
  }

  @Put()
  async configure(
    @Param('concertId') concertId: string,
    @Body() body: unknown,
  ) {
    const dto = ConfigureWaitingRoomRequestSchema.parse(body);
    try {
      const config = await this.configureWaitingRoom.execute({
        concertId,
        ...dto,
      });
      return serializeWaitingRoomConfig(config);
    } catch (error: unknown) {
      return this.mapError(error);
    }
  }

  @Patch('override')
  async override(
    @Param('concertId') concertId: string,
    @Body() body: unknown,
  ) {
    const dto = SetWaitingRoomOverrideRequestSchema.parse(body);
    try {
      const config = await this.setWaitingRoomOverride.execute({
        concertId,
        manualOverride: dto.manualOverride,
      });
      return serializeWaitingRoomConfig(config);
    } catch (error: unknown) {
      return this.mapError(error);
    }
  }

  private mapError(error: unknown): never {
    if (error instanceof WaitingRoomConcertNotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof WaitingRoomInvalidConfigError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}

