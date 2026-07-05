import { Injectable } from '@nestjs/common';
import { GeocodingProviderUnavailableError } from '../domain/errors';
import type { LocationResult } from '../domain/location-result';
import type { GeocodingProviderPort } from '../domain/ports/geocoding-provider.port';
import type { PlatformConfigService } from '../../platform/config/platform-config.service';

/**
 * Nominatim geocoding adapter.
 *
 * - Uses native Node 22 `fetch` + `AbortSignal.timeout`
 * - Hard-codes `countrycodes=vn` (Vietnam only)
 * - Sends required `User-Agent` and `Accept-Language: vi,en` headers
 * - Maps only `display_name`, `lat`, `lon` — no raw fields exposed
 * - All error conditions surface as `GeocodingProviderUnavailableError`
 */
@Injectable()
export class NominatimGeocodingAdapter implements GeocodingProviderPort {
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly contactEmail: string | undefined;
  private readonly timeoutMs: number;

  constructor(config: PlatformConfigService) {
    this.baseUrl = config.nominatimBaseUrl;
    this.userAgent = config.nominatimUserAgent ?? 'TicketBox/1.0';
    this.contactEmail = config.nominatimContactEmail;
    this.timeoutMs = config.nominatimTimeoutMs;
  }

  async searchLocations(query: string): Promise<LocationResult[]> {
    const url = new URL('/search', this.baseUrl);
    const params = new URLSearchParams({
      format: 'jsonv2',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'vn',
      q: query,
    });
    if (this.contactEmail) {
      params.set('email', this.contactEmail);
    }
    url.search = params.toString();

    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
      'Accept-Language': 'vi,en',
      Accept: 'application/json',
    };

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers,
      });
    } catch (err) {
      throw new GeocodingProviderUnavailableError(err);
    }

    if (!response.ok) {
      throw new GeocodingProviderUnavailableError();
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (err) {
      throw new GeocodingProviderUnavailableError(err);
    }

    if (!Array.isArray(body)) {
      throw new GeocodingProviderUnavailableError();
    }

    const results: LocationResult[] = [];
    for (const item of body) {
      if (typeof item !== 'object' || item === null) continue;
      const { display_name, lat, lon } = item as Record<string, unknown>;
      if (typeof display_name !== 'string' || display_name.length === 0) continue;
      const latitude = typeof lat === 'string' ? parseFloat(lat) : Number(lat);
      const longitude = typeof lon === 'string' ? parseFloat(lon) : Number(lon);
      if (!isFinite(latitude) || !isFinite(longitude)) continue;
      if (latitude < -90 || latitude > 90) continue;
      if (longitude < -180 || longitude > 180) continue;
      results.push({ displayName: display_name, latitude, longitude });
      if (results.length >= 5) break;
    }

    return results;
  }
}
