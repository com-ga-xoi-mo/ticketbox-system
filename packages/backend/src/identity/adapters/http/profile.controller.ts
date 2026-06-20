import { Controller, Get, Request, UnauthorizedException, UseGuards } from '@nestjs/common';

import { GetMyProfileQuery } from '../../application/queries/get-my-profile.query';
import type { AuthenticatedUser } from '../../domain/authenticated-user.interface';
import { Role } from '../../domain/role.enum';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from '../../infrastructure/passport/jwt-auth.guard';
import { toStaffProfileResponse } from './identity-contract.mapper';

/**
 * HTTP adapter for the authenticated user's own profile.
 *
 * Demonstrates how JwtAuthGuard + RolesGuard protect a route.
 * All authenticated users (any role) may access their own profile.
 */
@Controller('me')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfileController {
  constructor(private readonly getMyProfile: GetMyProfileQuery) {}

  @Get('profile')
  @Roles(Role.AUDIENCE, Role.ORGANIZER, Role.CHECKIN_STAFF, Role.ADMIN)
  async getProfile(@Request() req: { user: AuthenticatedUser }) {
    const profile = await this.getMyProfile.execute(req.user.id);
    if (!profile) {
      throw new UnauthorizedException('Authenticated user no longer exists');
    }

    return toStaffProfileResponse(req.user, profile);
  }
}
