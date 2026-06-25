import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { Role } from '../../../identity/domain/role.enum';
import { GetAdminDashboardMetricsUseCase } from '../../application/use-cases/get-admin-dashboard-metrics.use-case';
import { ListAdminAnalyticsReportsUseCase } from '../../application/use-cases/list-admin-analytics-reports.use-case';
import {
  DashboardAnalyticsQueryDto,
  type AdminDashboardMetricsResponseDto,
} from './dto/dashboard-analytics.dto';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminAnalyticsController {
  constructor(
    private readonly getDashboardMetricsUseCase: GetAdminDashboardMetricsUseCase,
    private readonly listAdminAnalyticsReportsUseCase: ListAdminAnalyticsReportsUseCase,
  ) {}

  @Get('dashboard')
  async dashboard(
    @Query() query: DashboardAnalyticsQueryDto,
  ): Promise<AdminDashboardMetricsResponseDto> {
    return this.getDashboardMetricsUseCase.execute({ windowDays: query.windowDays });
  }

  @Get('reports')
  async reports(@Query() query: any) {
    return this.listAdminAnalyticsReportsUseCase.execute({
      search: query.search,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
      status: query.status,
      windowDays: query.windowDays ? parseInt(query.windowDays) : undefined,
      organizerId: query.organizerId,
    });
  }
}
