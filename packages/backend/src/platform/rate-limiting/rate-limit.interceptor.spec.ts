import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  RateLimitExceededError,
  RateLimitStoreUnavailableError,
} from './rate-limit.errors';
import { RateLimitInterceptor } from './rate-limit.interceptor';
import { RateLimitPolicy } from './rate-limit-policy';
import { RateLimitActorKeyService } from './rate-limit-actor-key.service';

function buildContext(request: unknown, response: unknown): ExecutionContext {
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

describe('RateLimitInterceptor', () => {
  it('allows unannotated routes without consuming rate limit tokens', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) };
    const rateLimitService = { consume: vi.fn() };
    const interceptor = new RateLimitInterceptor(
      reflector as unknown as Reflector,
      new RateLimitActorKeyService(),
      rateLimitService as never,
    );
    const next = { handle: vi.fn(() => of('ok')) };

    const result = await interceptor.intercept(buildContext({}, {}), next);

    expect(rateLimitService.consume).not.toHaveBeenCalled();
    expect(next.handle).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
  });

  it('throws 429 with Retry-After and does not call the handler when a bucket is exhausted', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(RateLimitPolicy.CHECKOUT) };
    const rateLimitService = {
      consume: vi.fn().mockRejectedValue(new RateLimitExceededError(RateLimitPolicy.CHECKOUT, 9)),
    };
    const response = { setHeader: vi.fn() };
    const interceptor = new RateLimitInterceptor(
      reflector as unknown as Reflector,
      new RateLimitActorKeyService(),
      rateLimitService as never,
    );
    const next = { handle: vi.fn(() => of('ok')) };

    await expect(
      interceptor.intercept(
        buildContext({ user: { id: 'user-1' }, headers: {} }, response),
        next,
      ),
    ).rejects.toMatchObject({ response: expect.objectContaining({ statusCode: 429 }) });

    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '9');
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('does not mutate payment flow when payment initiation is rate limited', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(RateLimitPolicy.PAYMENT_INITIATION),
    };
    const rateLimitService = {
      consume: vi
        .fn()
        .mockRejectedValue(new RateLimitExceededError(RateLimitPolicy.PAYMENT_INITIATION, 30)),
    };
    const interceptor = new RateLimitInterceptor(
      reflector as unknown as Reflector,
      new RateLimitActorKeyService(),
      rateLimitService as never,
    );
    const next = { handle: vi.fn(() => of('provider-call')) };

    await expect(
      interceptor.intercept(
        buildContext(
          { user: { id: 'user-1' }, params: { id: 'order-1' }, headers: {} },
          { setHeader: vi.fn() },
        ),
        next,
      ),
    ).rejects.toMatchObject({ response: expect.objectContaining({ statusCode: 429 }) });

    expect(rateLimitService.consume).toHaveBeenCalledWith(
      RateLimitPolicy.PAYMENT_INITIATION,
      'user:user-1:order:order-1',
    );
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('maps protected store failures to 503', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(RateLimitPolicy.ADMIN_WRITE) };
    const rateLimitService = {
      consume: vi
        .fn()
        .mockRejectedValue(new RateLimitStoreUnavailableError(RateLimitPolicy.ADMIN_WRITE)),
    };
    const interceptor = new RateLimitInterceptor(
      reflector as unknown as Reflector,
      new RateLimitActorKeyService(),
      rateLimitService as never,
    );

    await expect(
      interceptor.intercept(
        buildContext({ user: { id: 'admin-1', roles: ['ADMIN'] }, headers: {} }, { setHeader: vi.fn() }),
        { handle: vi.fn(() => of('ok')) },
      ),
    ).rejects.toMatchObject({ response: expect.objectContaining({ statusCode: 503 }) });
  });
});
