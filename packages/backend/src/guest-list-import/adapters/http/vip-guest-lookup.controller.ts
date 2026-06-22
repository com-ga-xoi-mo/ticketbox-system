import { Body, Controller, ForbiddenException, Post, Request, UseGuards } from '@nestjs/common';
import type { VipLookupRequest, VipLookupResponse } from '@ticketbox/api-types';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { Role } from '../../../identity/domain/role.enum';
import {
  CheckinGateMismatchError,
  ConcertNotFoundError,
  MissingActiveCheckinAssignmentError,
  MissingCheckinStaffRoleError,
} from '../../../identity/domain/errors';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { LookupVipGuestUseCase } from '../../application/use-cases/lookup-vip-guest.use-case';
import { VipLookupRequestPipe } from './dto/vip-lookup.dto';
import { toVipLookupResponse } from './vip-lookup.mapper';

@Controller('guest-list')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CHECKIN_STAFF)
export class VipGuestLookupController {
  constructor(private readonly lookup: LookupVipGuestUseCase) {}
  @Post('lookup')
  async execute(
    @Body(VipLookupRequestPipe) dto: VipLookupRequest,
    @Request() req: { user: AuthenticatedUser },
  ): Promise<VipLookupResponse> {
    try {
      return toVipLookupResponse(await this.lookup.execute({ actor: req.user, ...dto }));
    } catch (error) {
      if (
        error instanceof MissingCheckinStaffRoleError ||
        error instanceof MissingActiveCheckinAssignmentError ||
        error instanceof CheckinGateMismatchError ||
        error instanceof ConcertNotFoundError
      ) {
        throw new ForbiddenException('An active assignment for this concert and gate is required');
      }
      throw error;
    }
  }
}
