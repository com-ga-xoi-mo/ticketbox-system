import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';

import type { HealthCheckResult } from './health.service';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getHealth(): Promise<HealthCheckResult> {
    const result = await this.healthService.check();

    if (result.status === 'down') {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
