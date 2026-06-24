import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { Role } from '../../../identity/domain/role.enum';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { GetOrganizerDashboardMetricsUseCase } from '../../application/use-cases/get-organizer-dashboard-metrics.use-case';
import {
  DashboardAnalyticsQueryDto,
  type OrganizerDashboardMetricsResponseDto,
} from './dto/dashboard-analytics.dto';

@Controller('organizer/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER)
export class OrganizerAnalyticsController {
  constructor(private readonly getDashboardMetricsUseCase: GetOrganizerDashboardMetricsUseCase) {}

  @Get('dashboard')
  async dashboard(
    @Query() query: DashboardAnalyticsQueryDto,
    @Request() req: { user: AuthenticatedUser },
  ): Promise<OrganizerDashboardMetricsResponseDto> {
    return this.getDashboardMetricsUseCase.execute({
      organizerId: req.user.id,
      windowDays: query.windowDays,
    });
  }
}
