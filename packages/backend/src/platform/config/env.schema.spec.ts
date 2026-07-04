import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.schema';
const base = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://ticketbox:ticketbox@localhost:5432/ticketbox',
  JWT_SECRET: 'secret',
  MOMO_PARTNER_CODE: 'momo-partner',
  MOMO_ACCESS_KEY: 'momo-access',
  MOMO_SECRET_KEY: 'momo-secret',
  VNPAY_TMN_CODE: 'vnpay-terminal',
  VNPAY_HASH_SECRET: 'vnpay-secret',
  S3_ENDPOINT: 'https://storage.example.com',
  S3_REGION: 'auto',
  S3_BUCKET: 'ticketbox-test',
  S3_ACCESS_KEY_ID: 'test-key',
  S3_SECRET_ACCESS_KEY: 'test-secret',
  S3_PUBLIC_BASE_URL: 'https://assets.example.com',
};
describe('Google authentication environment configuration', () => {
  it('requires a Google client ID outside tests', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'development' })).toThrow(/GOOGLE_CLIENT_ID/);
    expect(
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        GOOGLE_CLIENT_ID: 'client.apps.googleusercontent.com',
        NOMINATIM_USER_AGENT: 'TicketBox/1.0 dev@example.com',
      }).GOOGLE_CLIENT_ID,
    ).toBe('client.apps.googleusercontent.com');
  });

  it('allows tests to inject a verifier without Google configuration', () => {
    expect(validateEnv(base).GOOGLE_CLIENT_ID).toBeUndefined();
  });
});

describe('Nominatim geocoding environment configuration', () => {
  it('requires NOMINATIM_USER_AGENT in development and production', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'development' })).toThrow(/NOMINATIM_USER_AGENT/);
    expect(() => validateEnv({ ...base, NODE_ENV: 'production', GOOGLE_CLIENT_ID: 'g' })).toThrow(/NOMINATIM_USER_AGENT/);
  });

  it('does not require NOMINATIM_USER_AGENT in test mode', () => {
    expect(() => validateEnv(base)).not.toThrow();
    expect(validateEnv(base).NOMINATIM_USER_AGENT).toBeUndefined();
  });

  it('uses default NOMINATIM_BASE_URL and NOMINATIM_TIMEOUT_MS', () => {
    const env = validateEnv(base);
    expect(env.NOMINATIM_BASE_URL).toBe('https://nominatim.openstreetmap.org');
    expect(env.NOMINATIM_TIMEOUT_MS).toBe(5000);
  });

  it('rejects NOMINATIM_TIMEOUT_MS below 1000', () => {
    expect(() => validateEnv({ ...base, NOMINATIM_TIMEOUT_MS: 999 })).toThrow();
  });

  it('rejects NOMINATIM_TIMEOUT_MS above 15000', () => {
    expect(() => validateEnv({ ...base, NOMINATIM_TIMEOUT_MS: 15001 })).toThrow();
  });

  it('accepts custom timeout within range', () => {
    const env = validateEnv({ ...base, NOMINATIM_TIMEOUT_MS: 8000 });
    expect(env.NOMINATIM_TIMEOUT_MS).toBe(8000);
  });
});
describe('guest-list environment configuration', () => {
  it('provides safe local defaults', () => {
    const env = validateEnv(base);
    expect(env.GUEST_LIST_DISCOVERY_CRON).toBe('*/5 * * * *');
    expect(env.GUEST_LIST_MAX_ROWS).toBe(10000);
    expect(env.GUEST_LIST_PROCESSING_LEASE_MS).toBe(120000);
  });
  it.each(['bad', '99 99 * * *', '*/0 * * * *'])(
    'rejects parser-invalid cron expression %s',
    (cron) => {
      expect(() => validateEnv({ ...base, GUEST_LIST_DISCOVERY_CRON: cron })).toThrow();
    },
  );
  it.each(['*/5 * * * *', '15 * * * *', '0 2 * * *'])(
    'accepts valid interval and fixed-time cron expression %s',
    (cron) => {
      expect(
        validateEnv({ ...base, GUEST_LIST_DISCOVERY_CRON: cron }).GUEST_LIST_DISCOVERY_CRON,
      ).toBe(cron);
    },
  );
  it('rejects invalid guest-list limits', () => {
    expect(() => validateEnv({ ...base, GUEST_LIST_MAX_ROWS: 0 })).toThrow();
    expect(() => validateEnv({ ...base, GUEST_LIST_PROCESSING_LEASE_MS: 10 })).toThrow();
  });
});
