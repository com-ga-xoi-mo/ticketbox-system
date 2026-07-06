import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { CacheServicePort } from '../../platform/cache/cache.tokens';
import { CACHE_SERVICE } from '../../platform/cache/cache.tokens';
import { RateLimitPolicy } from '../../platform/rate-limiting/rate-limit-policy';
import { RateLimitService } from '../../platform/rate-limiting/rate-limit.service';
import type { GeocodingProviderPort } from '../domain/ports/geocoding-provider.port';
import { GEOCODING_PROVIDER } from '../domain/ports/geocoding-provider.port';
import type { LocationResult } from '../domain/location-result';
import { PlatformConfigService } from '../../platform/config/platform-config.service';

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildCacheKey(provider: string, country: string, language: string, query: string): string {
  const normalized = normalizeQuery(query);
  const hash = createHash('sha256').update(normalized).digest('hex');
  return `geocoding:v1:${provider}:${country}:${language}:${hash}`;
}

@Injectable()
export class SearchLocationsUseCase {
  private readonly lockTtlSeconds: number;

  constructor(
    @Inject(GEOCODING_PROVIDER) private readonly provider: GeocodingProviderPort,
    @Inject(CACHE_SERVICE) private readonly cache: CacheServicePort,
    private readonly rateLimitService: RateLimitService,
    private readonly config: PlatformConfigService,
  ) {
    // ceil(timeoutMs / 1000) + 2
    this.lockTtlSeconds = Math.ceil(config.nominatimTimeoutMs / 1000) + 2;
  }

  async execute(query: string): Promise<LocationResult[]> {
    const cacheKey = buildCacheKey('nominatim', 'vn', 'vi', query);

    return this.cache.getOrSet(
      cacheKey,
      CACHE_TTL_SECONDS,
      async () => {
        // Rate limit inside loader — only called on cache miss
        await this.rateLimitService.consume(RateLimitPolicy.GEOCODING_SEARCH, 'global');
        return this.provider.searchLocations(query);
      },
      { lockTtlSeconds: this.lockTtlSeconds },
    );
  }
}

export { buildCacheKey, normalizeQuery };
