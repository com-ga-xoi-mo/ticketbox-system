import { Controller, Get, Request, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from '../../domain/authenticated-user.interface';
import { Role } from '../../domain/role.enum';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from '../../infrastructure/passport/jwt-auth.guard';

/**
 * HTTP adapter for the authenticated user's own profile.
 *
 * Demonstrates how JwtAuthGuard + RolesGuard protect a route.
 * All authenticated users (any role) may access their own profile.
 */
@Controller('me')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfileController {
  @Get('profile')
  @Roles(Role.AUDIENCE, Role.ORGANIZER, Role.CHECKIN_STAFF, Role.ADMIN)
  getProfile(@Request() req: { user: AuthenticatedUser }) {
    return { id: req.user.id, roles: req.user.roles };
  }
}
