import { Controller, Get, Request, UseGuards } from '@nestjs/common';

import { Roles } from './decorators/roles.decorator';
import { Role } from './domain/role.enum';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

@Controller('me')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfileController {
  @Get('profile')
  @Roles(Role.AUDIENCE, Role.ORGANIZER, Role.CHECKIN_STAFF, Role.ADMIN)
  getProfile(@Request() req: { user: AuthenticatedUser }) {
    return { id: req.user.id, roles: req.user.roles };
  }
}
