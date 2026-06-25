import { Injectable } from '@nestjs/common';

import { PrismaService } from './prisma.service';

export interface DependencyHealth {
  status: 'up' | 'down';
  message?: string;
}

@Injectable()
export class DatabaseHealthIndicator {
  constructor(private readonly prismaService: PrismaService) {}

  async check(): Promise<DependencyHealth> {
    try {
      await this.prismaService.ping();
      return { status: 'up' };
    } catch (error) {
      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'PostgreSQL health check failed',
      };
    }
  }
}
