import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Put,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ConfigureWaitingRoomRequestSchema,
  SetWaitingRoomOverrideRequestSchema,
} from '@ticketbox/api-types';

import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import {
  ConcertNotFoundError,
  ForbiddenConcertOwnershipError,
} from '../../../identity/domain/errors';
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
  async get(
    @Param('concertId') concertId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    try {
      const config = await this.getWaitingRoomConfig.execute({
        concertId,
        ...this.actorInput(req.user),
      });
      if (!config) {
        throw new NotFoundException('Waiting room config not found');
      }
      return serializeWaitingRoomConfig(config);
    } catch (error: unknown) {
      return this.mapError(error);
    }
  }

  @Put()
  async configure(
    @Param('concertId') concertId: string,
    @Body() body: unknown,
    @Request() req: { user: AuthenticatedUser },
  ) {
    try {
      const parsed = ConfigureWaitingRoomRequestSchema.safeParse(body);
      if (!parsed.success) {
        throw new BadRequestException('Invalid request body');
      }
      const dto = parsed.data;
      const config = await this.configureWaitingRoom.execute({
        concertId,
        ...dto,
        ...this.actorInput(req.user),
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
    @Request() req: { user: AuthenticatedUser },
  ) {
    try {
      const parsed = SetWaitingRoomOverrideRequestSchema.safeParse(body);
      if (!parsed.success) {
        throw new BadRequestException('Invalid request body');
      }
      const dto = parsed.data;
      const config = await this.setWaitingRoomOverride.execute({
        concertId,
        manualOverride: dto.manualOverride,
        ...this.actorInput(req.user),
      });
      return serializeWaitingRoomConfig(config);
    } catch (error: unknown) {
      return this.mapError(error);
    }
  }

  private mapError(error: unknown): never {
    if (error instanceof ForbiddenConcertOwnershipError) {
      throw new ForbiddenException(error.message);
    }
    if (error instanceof ConcertNotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof WaitingRoomConcertNotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof WaitingRoomInvalidConfigError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }

  private actorInput(user: AuthenticatedUser) {
    return {
      actor: { userId: user.id, roles: user.roles },
      allowAdminOverride: user.roles.includes(Role.ADMIN),
    };
  }
}
