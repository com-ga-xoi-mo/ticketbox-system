import { describe, expect, it } from 'vitest';

import { RateLimitActorKeyService } from './rate-limit-actor-key.service';
import { RateLimitPolicy } from './rate-limit-policy';

describe('RateLimitActorKeyService', () => {
  const service = new RateLimitActorKeyService();

  it('derives isolated actor keys for each protected endpoint policy', () => {
    const request = {
      ip: '127.0.0.1',
      headers: { 'x-device-id': 'device-1' },
      params: { id: 'order-1' },
      user: { id: 'user-1', roles: ['ADMIN'] },
    };

    expect(service.derive(RateLimitPolicy.BROWSING, request)).toBe('ip:127.0.0.1');
    expect(service.derive(RateLimitPolicy.CHECKOUT, request)).toBe('user:user-1');
    expect(service.derive(RateLimitPolicy.PAYMENT_INITIATION, request)).toBe(
      'user:user-1:order:order-1',
    );
    expect(service.derive(RateLimitPolicy.ADMIN_WRITE, request)).toBe('roles:ADMIN:user:user-1');
    expect(service.derive(RateLimitPolicy.CHECKIN_SYNC, request)).toBe('device:device-1');
  });

  it('falls back check-in sync keys from device to staff user to client IP', () => {
    expect(
      service.derive(RateLimitPolicy.CHECKIN_SYNC, {
        body: { deviceId: ' device-body-1 ' },
        user: { id: 'staff-1', roles: ['CHECKIN_STAFF'] },
      }),
    ).toBe('device:device-body-1');
    expect(
      service.derive(RateLimitPolicy.CHECKIN_SYNC, {
        user: { id: 'staff-1', roles: ['CHECKIN_STAFF'] },
      }),
    ).toBe('staff:staff-1');
    expect(
      service.derive(RateLimitPolicy.CHECKIN_SYNC, {
        headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' },
      }),
    ).toBe('ip:10.0.0.1');
  });
});
