import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.schema';
const base = {
  DATABASE_URL: 'postgresql://ticketbox:ticketbox@localhost:5432/ticketbox',
  JWT_SECRET: 'secret',
  MOMO_PARTNER_CODE: 'momo-partner',
  MOMO_ACCESS_KEY: 'momo-access',
  MOMO_SECRET_KEY: 'momo-secret',
  VNPAY_TMN_CODE: 'vnpay-terminal',
  VNPAY_HASH_SECRET: 'vnpay-secret',
};
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
