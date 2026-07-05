import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NominatimGeocodingAdapter } from './nominatim-geocoding.adapter';
import { GeocodingProviderUnavailableError } from '../domain/errors';
import type { PlatformConfigService } from '../../platform/config/platform-config.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeConfig(overrides: Partial<{
  nominatimBaseUrl: string;
  nominatimUserAgent: string | undefined;
  nominatimContactEmail: string | undefined;
  nominatimTimeoutMs: number;
}> = {}): PlatformConfigService {
  return {
    nominatimBaseUrl: 'https://nominatim.openstreetmap.org',
    nominatimUserAgent: 'TicketBox/1.0 (test)',
    nominatimContactEmail: undefined,
    nominatimTimeoutMs: 5000,
    ...overrides,
  } as unknown as PlatformConfigService;
}

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function abortingFetch() {
  return vi.fn().mockRejectedValue(Object.assign(new Error('AbortError'), { name: 'AbortError' }));
}

function networkErrorFetch() {
  return vi.fn().mockRejectedValue(new TypeError('fetch failed'));
}

function badJsonFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.reject(new SyntaxError('Unexpected token')),
  });
}

const validItem = {
  display_name: 'Nhà hát Thành phố, Hồ Chí Minh',
  lat: '10.7769553',
  lon: '106.7031668',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('NominatimGeocodingAdapter', () => {
  let globalFetch: typeof fetch;

  beforeEach(() => {
    globalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = globalFetch;
  });

  // ── URL / params ──────────────────────────────────────────────────────────
  it('sends correct URL with required params', async () => {
    const fetchMock = mockFetch([validItem]);
    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = new NominatimGeocodingAdapter(makeConfig());
    await adapter.searchLocations('Nhà hát Thành phố');

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://nominatim.openstreetmap.org');
    expect(parsed.pathname).toBe('/search');
    expect(parsed.searchParams.get('format')).toBe('jsonv2');
    expect(parsed.searchParams.get('addressdetails')).toBe('1');
    expect(parsed.searchParams.get('limit')).toBe('5');
    expect(parsed.searchParams.get('countrycodes')).toBe('vn');
    expect(parsed.searchParams.get('q')).toBe('Nhà hát Thành phố');
  });

  it('does NOT include email param when contact email is absent', async () => {
    const fetchMock = mockFetch([validItem]);
    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = new NominatimGeocodingAdapter(makeConfig({ nominatimContactEmail: undefined }));
    await adapter.searchLocations('test');

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).searchParams.has('email')).toBe(false);
  });

  it('includes email param when contact email is set', async () => {
    const fetchMock = mockFetch([validItem]);
    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = new NominatimGeocodingAdapter(
      makeConfig({ nominatimContactEmail: 'dev@ticketbox.test' }),
    );
    await adapter.searchLocations('test');

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).searchParams.get('email')).toBe('dev@ticketbox.test');
  });

  // ── Headers ───────────────────────────────────────────────────────────────
  it('sends required User-Agent and Accept-Language headers', async () => {
    const fetchMock = mockFetch([validItem]);
    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = new NominatimGeocodingAdapter(
      makeConfig({ nominatimUserAgent: 'TicketBox/1.0 contact@test.com' }),
    );
    await adapter.searchLocations('test');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['User-Agent']).toBe('TicketBox/1.0 contact@test.com');
    expect(headers['Accept-Language']).toBe('vi,en');
  });

  // ── Valid mapping ─────────────────────────────────────────────────────────
  it('maps valid results to LocationResult[]', async () => {
    global.fetch = mockFetch([validItem]) as unknown as typeof fetch;

    const adapter = new NominatimGeocodingAdapter(makeConfig());
    const results = await adapter.searchLocations('Nhà hát Thành phố');

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      displayName: 'Nhà hát Thành phố, Hồ Chí Minh',
      latitude: 10.7769553,
      longitude: 106.7031668,
    });
  });

  it('returns empty array for empty results', async () => {
    global.fetch = mockFetch([]) as unknown as typeof fetch;

    const adapter = new NominatimGeocodingAdapter(makeConfig());
    const results = await adapter.searchLocations('nothing');

    expect(results).toEqual([]);
  });

  it('caps results at 5', async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      display_name: `Location ${i}`,
      lat: `${10 + i}`,
      lon: `${106 + i}`,
    }));
    global.fetch = mockFetch(items) as unknown as typeof fetch;

    const adapter = new NominatimGeocodingAdapter(makeConfig());
    const results = await adapter.searchLocations('test');

    expect(results).toHaveLength(5);
  });

  // ── Malformed item filtering ───────────────────────────────────────────────
  it('filters out items with missing display_name', async () => {
    const items = [
      { lat: '10.0', lon: '106.0' },           // no display_name
      validItem,
    ];
    global.fetch = mockFetch(items) as unknown as typeof fetch;

    const adapter = new NominatimGeocodingAdapter(makeConfig());
    const results = await adapter.searchLocations('test');

    expect(results).toHaveLength(1);
    expect(results[0].displayName).toBe(validItem.display_name);
  });

  it('filters out items with non-finite lat/lon', async () => {
    const items = [
      { display_name: 'Bad coords', lat: 'not-a-number', lon: '106.0' },
      { display_name: 'Infinity lat', lat: 'Infinity', lon: '106.0' },
      validItem,
    ];
    global.fetch = mockFetch(items) as unknown as typeof fetch;

    const adapter = new NominatimGeocodingAdapter(makeConfig());
    const results = await adapter.searchLocations('test');

    expect(results).toHaveLength(1);
  });

  it('filters out items with out-of-range coordinates', async () => {
    const items = [
      { display_name: 'Bad lat', lat: '91', lon: '106.0' },
      { display_name: 'Bad lon', lat: '10.0', lon: '181' },
      validItem,
    ];
    global.fetch = mockFetch(items) as unknown as typeof fetch;

    const adapter = new NominatimGeocodingAdapter(makeConfig());
    const results = await adapter.searchLocations('test');

    expect(results).toHaveLength(1);
  });

  it('filters out null/non-object items in array', async () => {
    const items = [null, 42, 'string', validItem];
    global.fetch = mockFetch(items) as unknown as typeof fetch;

    const adapter = new NominatimGeocodingAdapter(makeConfig());
    const results = await adapter.searchLocations('test');

    expect(results).toHaveLength(1);
  });

  // ── Malformed top-level payload ───────────────────────────────────────────
  it('throws GeocodingProviderUnavailableError when body is not an array', async () => {
    global.fetch = mockFetch({ error: 'oops' }) as unknown as typeof fetch;

    const adapter = new NominatimGeocodingAdapter(makeConfig());
    await expect(adapter.searchLocations('test')).rejects.toBeInstanceOf(
      GeocodingProviderUnavailableError,
    );
  });

  // ── Non-2xx response ──────────────────────────────────────────────────────
  it('throws GeocodingProviderUnavailableError on non-2xx response', async () => {
    global.fetch = mockFetch('Too Many Requests', 429) as unknown as typeof fetch;

    const adapter = new NominatimGeocodingAdapter(makeConfig());
    await expect(adapter.searchLocations('test')).rejects.toBeInstanceOf(
      GeocodingProviderUnavailableError,
    );
  });

  it('throws GeocodingProviderUnavailableError on 500', async () => {
    global.fetch = mockFetch('Server Error', 500) as unknown as typeof fetch;

    const adapter = new NominatimGeocodingAdapter(makeConfig());
    await expect(adapter.searchLocations('test')).rejects.toBeInstanceOf(
      GeocodingProviderUnavailableError,
    );
  });

  // ── Invalid JSON ─────────────────────────────────────────────────────────
  it('throws GeocodingProviderUnavailableError when JSON is invalid', async () => {
    global.fetch = badJsonFetch() as unknown as typeof fetch;

    const adapter = new NominatimGeocodingAdapter(makeConfig());
    await expect(adapter.searchLocations('test')).rejects.toBeInstanceOf(
      GeocodingProviderUnavailableError,
    );
  });

  // ── Abort timeout ─────────────────────────────────────────────────────────
  it('throws GeocodingProviderUnavailableError on abort/timeout', async () => {
    global.fetch = abortingFetch() as unknown as typeof fetch;

    const adapter = new NominatimGeocodingAdapter(makeConfig());
    await expect(adapter.searchLocations('test')).rejects.toBeInstanceOf(
      GeocodingProviderUnavailableError,
    );
  });

  // ── Network error ─────────────────────────────────────────────────────────
  it('throws GeocodingProviderUnavailableError on network error', async () => {
    global.fetch = networkErrorFetch() as unknown as typeof fetch;

    const adapter = new NominatimGeocodingAdapter(makeConfig());
    await expect(adapter.searchLocations('test')).rejects.toBeInstanceOf(
      GeocodingProviderUnavailableError,
    );
  });

  // ── Safe errors — no upstream detail exposed ───────────────────────────────
  it('does not expose upstream URL or response body in the error message', async () => {
    global.fetch = mockFetch('secret upstream response', 503) as unknown as typeof fetch;

    const adapter = new NominatimGeocodingAdapter(makeConfig());
    try {
      await adapter.searchLocations('test');
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as Error).message).not.toContain('nominatim.openstreetmap.org');
      expect((err as Error).message).not.toContain('secret upstream response');
    }
  });
});
