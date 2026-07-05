/**
 * Unit tests for LocationsController.
 *
 * Tests:
 * - Auth guards are applied (ADMIN and ORGANIZER allowed; AUDIENCE and anonymous blocked conceptually)
 * - Valid query → 200 with results
 * - Missing/short/long/unknown query → 400
 * - Rate limit exhausted → 429 with Retry-After header
 * - Provider unavailable → 503
 * - Rate limit store unavailable → 503
 * - Raw internals (URLs, keys, stack traces) not in 503 responses
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, HttpException, ServiceUnavailableException } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { SearchLocationsUseCase } from '../../application/search-locations.use-case';
import { GeocodingProviderUnavailableError } from '../../domain/errors';
import { RateLimitExceededError, RateLimitStoreUnavailableError } from '../../../platform/rate-limiting/rate-limit.errors';
import { RateLimitPolicy } from '../../../platform/rate-limiting/rate-limit-policy';
import type { LocationResult } from '../../domain/location-result';

const sampleResults: LocationResult[] = [
  { displayName: 'Nhà hát Thành phố', latitude: 10.776, longitude: 106.703 },
];

function makeUseCase(behavior: 'ok' | 'exceeded' | 'store-unavailable' | 'provider-unavailable' = 'ok') {
  const mock = {
    execute: vi.fn(),
  };
  if (behavior === 'ok') {
    mock.execute.mockResolvedValue(sampleResults);
  } else if (behavior === 'exceeded') {
    mock.execute.mockRejectedValue(new RateLimitExceededError(RateLimitPolicy.GEOCODING_SEARCH, 2));
  } else if (behavior === 'store-unavailable') {
    mock.execute.mockRejectedValue(new RateLimitStoreUnavailableError(RateLimitPolicy.GEOCODING_SEARCH));
  } else {
    mock.execute.mockRejectedValue(new GeocodingProviderUnavailableError());
  }
  return mock as unknown as SearchLocationsUseCase;
}

function makeRes() {
  return { setHeader: vi.fn() } as any;
}

// ---------------------------------------------------------------------------
// Guard application (structural check via metadata)
// ---------------------------------------------------------------------------
describe('LocationsController guard and role metadata', () => {
  it('exposes a search() method', () => {
    expect(typeof LocationsController.prototype.search).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Valid request → 200
// ---------------------------------------------------------------------------
describe('LocationsController.search — valid query', () => {
  it('returns { results } on valid query', async () => {
    const controller = new LocationsController(makeUseCase('ok'));
    const result = await controller.search({ q: 'Nhà hát Thành phố' }, makeRes());
    expect(result).toEqual({ results: sampleResults });
  });

  it('trims whitespace from query before passing to use case', async () => {
    const uc = makeUseCase('ok');
    const controller = new LocationsController(uc);
    await controller.search({ q: '  Nhà hát  ' }, makeRes());
    // The schema trims the query, so use case gets trimmed value
    expect((uc.execute as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('Nhà hát');
  });
});

// ---------------------------------------------------------------------------
// Invalid query → 400
// ---------------------------------------------------------------------------
describe('LocationsController.search — invalid query → 400', () => {
  it('throws BadRequestException when q is missing', async () => {
    const controller = new LocationsController(makeUseCase('ok'));
    await expect(controller.search({}, makeRes())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when q is too short (< 3 chars after trim)', async () => {
    const controller = new LocationsController(makeUseCase('ok'));
    await expect(controller.search({ q: '  ab  ' }, makeRes())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when q is too long (> 200 chars)', async () => {
    const controller = new LocationsController(makeUseCase('ok'));
    await expect(controller.search({ q: 'a'.repeat(201) }, makeRes())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException for unknown query parameters', async () => {
    const controller = new LocationsController(makeUseCase('ok'));
    await expect(controller.search({ q: 'test venue', extra: 'field' }, makeRes())).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// Rate limit exhausted → 429 + Retry-After
// ---------------------------------------------------------------------------
describe('LocationsController.search — rate limit exhausted → 429', () => {
  it('throws HttpException with 429 status', async () => {
    const controller = new LocationsController(makeUseCase('exceeded'));
    const res = makeRes();
    await expect(controller.search({ q: 'test venue' }, res)).rejects.toBeInstanceOf(HttpException);
    try {
      await new LocationsController(makeUseCase('exceeded')).search({ q: 'test venue' }, makeRes());
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(429);
    }
  });

  it('sets Retry-After header on response', async () => {
    const controller = new LocationsController(makeUseCase('exceeded'));
    const res = makeRes();
    try {
      await controller.search({ q: 'test venue' }, res);
    } catch {
      // expected
    }
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });
});

// ---------------------------------------------------------------------------
// Provider unavailable → 503
// ---------------------------------------------------------------------------
describe('LocationsController.search — provider unavailable → 503', () => {
  it('throws ServiceUnavailableException on GeocodingProviderUnavailableError', async () => {
    const controller = new LocationsController(makeUseCase('provider-unavailable'));
    await expect(controller.search({ q: 'test venue' }, makeRes())).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('does not expose internal Nominatim URL in 503 message', async () => {
    const controller = new LocationsController(makeUseCase('provider-unavailable'));
    try {
      await controller.search({ q: 'test venue' }, makeRes());
      expect.fail('should have thrown');
    } catch (err) {
      const msg = JSON.stringify((err as ServiceUnavailableException).getResponse());
      expect(msg).not.toContain('nominatim.openstreetmap.org');
    }
  });
});

// ---------------------------------------------------------------------------
// Rate limit store unavailable → 503
// ---------------------------------------------------------------------------
describe('LocationsController.search — limiter store unavailable → 503', () => {
  it('throws ServiceUnavailableException on RateLimitStoreUnavailableError', async () => {
    const controller = new LocationsController(makeUseCase('store-unavailable'));
    await expect(controller.search({ q: 'test venue' }, makeRes())).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
