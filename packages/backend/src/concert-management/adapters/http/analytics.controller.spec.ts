import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { Role } from '../../../identity/domain/role.enum';
import { ROLES_KEY } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { OrganizerAnalyticsController } from './organizer-analytics.controller';

describe('analytics controller route protection', () => {
  it('protects admin analytics with ADMIN role', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminAnalyticsController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(new Reflector().get<Role[]>(ROLES_KEY, AdminAnalyticsController)).toEqual([Role.ADMIN]);
  });

  it('protects organizer analytics with ORGANIZER role', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, OrganizerAnalyticsController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(new Reflector().get<Role[]>(ROLES_KEY, OrganizerAnalyticsController)).toEqual([
      Role.ORGANIZER,
    ]);
  });
});

describe('analytics controllers', () => {
  it('passes admin query window to the admin dashboard use case', async () => {
    const useCase = {
      execute: vi.fn().mockResolvedValue({ totalPlatformRevenueVnd: 0 }),
    };
    const controller = new AdminAnalyticsController(useCase as never, {} as never);

    await expect(controller.dashboard({ windowDays: 14 })).resolves.toEqual({
      totalPlatformRevenueVnd: 0,
    });
    expect(useCase.execute).toHaveBeenCalledWith({ windowDays: 14 });
  });

  it('passes authenticated organizer id to the organizer dashboard use case', async () => {
    const useCase = {
      execute: vi.fn().mockResolvedValue({ myTotalRevenueVnd: 0 }),
    };
    const controller = new OrganizerAnalyticsController(useCase as never);

    await expect(
      controller.dashboard(
        { windowDays: 14 },
        { user: { id: 'organizer-1', roles: [Role.ORGANIZER] } },
      ),
    ).resolves.toEqual({ myTotalRevenueVnd: 0 });
    expect(useCase.execute).toHaveBeenCalledWith({
      organizerId: 'organizer-1',
      windowDays: 14,
    });
  });
});
