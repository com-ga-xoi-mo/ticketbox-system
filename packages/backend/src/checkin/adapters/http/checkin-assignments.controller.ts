import type { StaffAssignmentsResponse } from '@ticketbox/api-types';
import { Controller, Get, Request, UseGuards } from '@nestjs/common';

import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { Role } from '../../../identity/domain/role.enum';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { ListMyCheckinAssignmentsQuery } from '../../application/queries/list-my-checkin-assignments.query';

@Controller('checkin/assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CHECKIN_STAFF)
export class CheckinAssignmentsController {
  constructor(private readonly listMyAssignments: ListMyCheckinAssignmentsQuery) {}

  @Get()
  async list(@Request() req: { user: AuthenticatedUser }): Promise<StaffAssignmentsResponse> {
    const assignments = await this.listMyAssignments.execute(req.user.id);
    return assignments.map(({ startsAt, ...assignment }) => ({
      ...assignment,
      ...(startsAt ? { startsAt: startsAt.toISOString() } : {}),
    }));
  }
}
