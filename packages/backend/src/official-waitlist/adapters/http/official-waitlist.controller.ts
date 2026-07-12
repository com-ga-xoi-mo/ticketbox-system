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
import { JoinWaitlistRequestSchema } from '@ticketbox/api-types';

import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { Role } from '../../../identity/domain/role.enum';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import {
  GetWaitlistStatusUseCase,
  JoinWaitlistUseCase,
  LeaveWaitlistUseCase,
} from '../../application/use-cases/waitlist.use-cases';
import {
  WaitlistEntryNotFoundError,
  WaitlistQuantityExceededError,
  WaitlistTicketTypeNotEligibleError,
  WaitlistTicketTypeNotFoundError,
} from '../../domain/errors';
import { serializeWaitlistStatus } from './waitlist.presenter';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AUDIENCE)
export class OfficialWaitlistController {
  constructor(
    private readonly joinWaitlist: JoinWaitlistUseCase,
    private readonly leaveWaitlist: LeaveWaitlistUseCase,
    private readonly getWaitlistStatus: GetWaitlistStatusUseCase,
  ) {}

  @Post('me/waitlist')
  async join(
    @Body() body: unknown,
    @Request() req: { user: AuthenticatedUser },
  ) {
    const dto = JoinWaitlistRequestSchema.parse(body);
    try {
      const status = await this.joinWaitlist.execute({
        userId: req.user.id,
        concertId: dto.concertId,
        ticketTypeId: dto.ticketTypeId,
        desiredQuantity: dto.desiredQuantity,
      });
      return serializeWaitlistStatus(status, dto);
    } catch (error: unknown) {
      return this.mapError(error);
    }
  }

  @Get('me/waitlist/status')
  async status(
    @Query('concertId') concertId: string,
    @Query('ticketTypeId') ticketTypeId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    const status = await this.getWaitlistStatus.execute({
      userId: req.user.id,
      concertId,
      ticketTypeId,
    });
    return serializeWaitlistStatus(status, { concertId, ticketTypeId });
  }

  @Delete('me/waitlist/:ticketTypeId')
  async leave(
    @Param('ticketTypeId') ticketTypeId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    try {
      const result = await this.leaveWaitlist.execute({
        userId: req.user.id,
        ticketTypeId,
      });
      return {
        entryId: result.entry?.id ?? null,
        revokedEntitlementId: result.revokedEntitlementId,
        status: result.entry?.status ?? null,
      };
    } catch (error: unknown) {
      return this.mapError(error);
    }
  }

  private mapError(error: unknown): never {
    if (
      error instanceof WaitlistTicketTypeNotFoundError ||
      error instanceof WaitlistEntryNotFoundError
    ) {
      throw new NotFoundException(error.message);
    }
    if (
      error instanceof WaitlistTicketTypeNotEligibleError ||
      error instanceof WaitlistQuantityExceededError
    ) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
