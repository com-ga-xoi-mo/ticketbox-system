import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { SearchLocationsUseCase, buildCacheKey, normalizeQuery } from './search-locations.use-case';
import { RateLimitExceededError, RateLimitStoreUnavailableError } from '../../platform/rate-limiting/rate-limit.errors';
import { RateLimitPolicy } from '../../platform/rate-limiting/rate-limit-policy';
import type { GeocodingProviderPort } from '../domain/ports/geocoding-provider.port';
import type { CacheServicePort } from '../../platform/cache/cache.tokens';
import type { RateLimitService } from '../../platform/rate-limiting/rate-limit.service';
import type { PlatformConfigService } from '../../platform/config/platform-config.service';
import type { LocationResult } from '../domain/location-result';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const sampleResult: LocationResult = {
  displayName: 'Nhà hát Thành phố',
  latitude: 10.776,
  longitude: 106.703,
};

function makeConfig(timeoutMs = 5000): PlatformConfigService {
  return { nominatimTimeoutMs: timeoutMs } as unknown as PlatformConfigService;
}

function makeProvider(results: LocationResult[] = [sampleResult]): GeocodingProviderPort {
  return { searchLocations: vi.fn().mockResolvedValue(results) };
}

function makeCacheService(mode: 'miss' | 'hit' = 'miss'): CacheServicePort {
  const store = new Map<string, unknown>();

  return {
    getOrSet: vi.fn(async (key: string, _ttl: number, loader: () => Promise<unknown>, _opts?: unknown) => {
      if (mode === 'hit' && store.has(key)) {
        return store.get(key);
      }
      const value = await loader();
      store.set(key, value);
      return value;
    }),
    del: vi.fn(),
    delByPrefix: vi.fn(),
  } as unknown as CacheServicePort;
}

function makeRateLimitService(behavior: 'ok' | 'exceeded' | 'unavailable' = 'ok'): RateLimitService {
  if (behavior === 'ok') {
    return { consume: vi.fn().mockResolvedValue(undefined) } as unknown as RateLimitService;
  }
  if (behavior === 'exceeded') {
    return {
      consume: vi.fn().mockRejectedValue(new RateLimitExceededError(RateLimitPolicy.GEOCODING_SEARCH, 1)),
    } as unknown as RateLimitService;
  }
  return {
    consume: vi.fn().mockRejectedValue(new RateLimitStoreUnavailableError(RateLimitPolicy.GEOCODING_SEARCH)),
  } as unknown as RateLimitService;
}

// ---------------------------------------------------------------------------
// buildCacheKey + normalizeQuery helpers
// ---------------------------------------------------------------------------
describe('buildCacheKey', () => {
  it('produces geocoding:v1:<provider>:<country>:<language>:<sha256> format', () => {
    const key = buildCacheKey('nominatim', 'vn', 'vi', 'Nhà hát');
    expect(key).toMatch(/^geocoding:v1:nominatim:vn:vi:[0-9a-f]{64}$/);
  });

  it('normalizes query before hashing — whitespace variants share the same key', () => {
    const key1 = buildCacheKey('nominatim', 'vn', 'vi', '  nhà hát  ');
    const key2 = buildCacheKey('nominatim', 'vn', 'vi', 'nhà  hát');
    const key3 = buildCacheKey('nominatim', 'vn', 'vi', 'NHÀ HÁT');
    expect(key1).toBe(key2);
    expect(key1).toBe(key3);
  });

  it('different provider/country/language produce different keys', () => {
    const key1 = buildCacheKey('nominatim', 'vn', 'vi', 'test');
    const key2 = buildCacheKey('google', 'vn', 'vi', 'test');
    const key3 = buildCacheKey('nominatim', 'th', 'vi', 'test');
    const key4 = buildCacheKey('nominatim', 'vn', 'en', 'test');
    expect(new Set([key1, key2, key3, key4]).size).toBe(4);
  });

  it('raw query content does NOT appear in the key', () => {
    const key = buildCacheKey('nominatim', 'vn', 'vi', 'personal address 123');
    expect(key).not.toContain('personal');
    expect(key).not.toContain('address');
    expect(key).not.toContain('123');
  });
});

// ---------------------------------------------------------------------------
// SearchLocationsUseCase
// ---------------------------------------------------------------------------
describe('SearchLocationsUseCase', () => {
  let provider: GeocodingProviderPort;
  let rateLimitService: RateLimitService;
  let cache: CacheServicePort;

  beforeEach(() => {
    provider = makeProvider();
    rateLimitService = makeRateLimitService('ok');
    cache = makeCacheService('miss');
  });

  // ── Cache miss → rate limit → provider ────────────────────────────────────
  it('cache miss: calls rateLimitService with GEOCODING_SEARCH and actorKey=global', async () => {
    const useCase = new SearchLocationsUseCase(provider, cache, rateLimitService, makeConfig());
    await useCase.execute('test query');

    expect(rateLimitService.consume).toHaveBeenCalledWith(RateLimitPolicy.GEOCODING_SEARCH, 'global');
  });

  it('cache miss: calls provider and returns results', async () => {
    const useCase = new SearchLocationsUseCase(provider, cache, rateLimitService, makeConfig());
    const results = await useCase.execute('test query');

    expect(provider.searchLocations).toHaveBeenCalledWith('test query');
    expect(results).toEqual([sampleResult]);
  });

  it('cache miss: calls getOrSet with 7-day TTL and custom lockTtlSeconds', async () => {
    const useCase = new SearchLocationsUseCase(provider, cache, rateLimitService, makeConfig(5000));
    await useCase.execute('test query');

    expect(cache.getOrSet).toHaveBeenCalledWith(
      expect.stringMatching(/^geocoding:v1:/),
      7 * 24 * 60 * 60,
      expect.any(Function),
      { lockTtlSeconds: 7 }, // ceil(5000/1000) + 2 = 7
    );
  });

  it('lockTtlSeconds is ceil(timeoutMs/1000)+2', async () => {
    const useCase = new SearchLocationsUseCase(provider, cache, rateLimitService, makeConfig(3000));
    await useCase.execute('test query');

    expect(cache.getOrSet).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Number),
      expect.any(Function),
      { lockTtlSeconds: 5 }, // ceil(3000/1000) + 2 = 5
    );
  });

  // ── Cache hit → no rate limit, no provider ────────────────────────────────
  it('cache hit: does not call rate limiter or provider', async () => {
    const hitCache: CacheServicePort = {
      getOrSet: vi.fn().mockResolvedValue([sampleResult]), // simulates cache hit
      del: vi.fn(),
      delByPrefix: vi.fn(),
    } as unknown as CacheServicePort;

    const useCase = new SearchLocationsUseCase(provider, hitCache, rateLimitService, makeConfig());
    const results = await useCase.execute('test query');

    // loader was never called → rate limiter and provider never called
    expect(rateLimitService.consume).not.toHaveBeenCalled();
    expect(provider.searchLocations).not.toHaveBeenCalled();
    expect(results).toEqual([sampleResult]);
  });

  // ── Rate limit exhausted → no provider call ───────────────────────────────
  it('rate limit exhausted: throws RateLimitExceededError, no provider call', async () => {
    rateLimitService = makeRateLimitService('exceeded');
    const useCase = new SearchLocationsUseCase(provider, cache, rateLimitService, makeConfig());

    await expect(useCase.execute('test query')).rejects.toBeInstanceOf(RateLimitExceededError);
    expect(provider.searchLocations).not.toHaveBeenCalled();
  });

  // ── Rate limit store unavailable → no provider call ──────────────────────
  it('rate limit store unavailable: throws RateLimitStoreUnavailableError, no provider call', async () => {
    rateLimitService = makeRateLimitService('unavailable');
    const useCase = new SearchLocationsUseCase(provider, cache, rateLimitService, makeConfig());

    await expect(useCase.execute('test query')).rejects.toBeInstanceOf(RateLimitStoreUnavailableError);
    expect(provider.searchLocations).not.toHaveBeenCalled();
  });

  // ── actorKey is 'global', NOT per-user/IP ─────────────────────────────────
  it('consume is called with literal "global" actorKey, not a user or IP value', async () => {
    const useCase = new SearchLocationsUseCase(provider, cache, rateLimitService, makeConfig());
    await useCase.execute('test');

    const [, actorKey] = (rateLimitService.consume as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(actorKey).toBe('global');
  });

  // ── Cache key does not contain raw query ─────────────────────────────────
  it('cache key does not contain the raw query string', async () => {
    const useCase = new SearchLocationsUseCase(provider, cache, rateLimitService, makeConfig());
    await useCase.execute('confidential street address');

    const [cacheKey] = (cache.getOrSet as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(cacheKey).not.toContain('confidential');
    expect(cacheKey).not.toContain('street');
    expect(cacheKey).not.toContain('address');
  });
});
