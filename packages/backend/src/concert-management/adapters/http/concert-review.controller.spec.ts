import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { Role } from '../../../identity/domain/role.enum';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { ROLES_KEY } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { RATE_LIMIT_POLICY_KEY } from '../../../platform/rate-limiting/rate-limit.decorator';
import { RateLimitPolicy } from '../../../platform/rate-limiting/rate-limit-policy';
import { AdminConcertReviewController } from './admin-concert-review.controller';
import { ConcertReviewController } from './concert-review.controller';

describe('concert review route protection', () => {
  it('keeps public review listing open but browsing rate limited', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ConcertReviewController.prototype.list)).toBeUndefined();
    expect(Reflect.getMetadata(RATE_LIMIT_POLICY_KEY, ConcertReviewController.prototype.list)).toBe(
      RateLimitPolicy.BROWSING,
    );
  });

  it('restricts audience review mutations to authenticated audience users', () => {
    for (const handler of [
      ConcertReviewController.prototype.create,
      ConcertReviewController.prototype.updateMine,
      ConcertReviewController.prototype.deleteMine,
    ]) {
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([JwtAuthGuard, RolesGuard]);
      expect(new Reflector().get<Role[]>(ROLES_KEY, handler)).toEqual([Role.AUDIENCE]);
      expect(Reflect.getMetadata(RATE_LIMIT_POLICY_KEY, handler)).toBe(RateLimitPolicy.CHECKOUT);
    }
  });

  it('restricts review hiding to admin users', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminConcertReviewController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(new Reflector().get<Role[]>(ROLES_KEY, AdminConcertReviewController)).toEqual([
      Role.ADMIN,
    ]);
    expect(Reflect.getMetadata(RATE_LIMIT_POLICY_KEY, AdminConcertReviewController.prototype.hide)).toBe(
      RateLimitPolicy.ADMIN_WRITE,
    );
  });
});
