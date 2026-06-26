import { describe, expect, it } from 'vitest';

import { validateEnv } from '../env.schema';

const baseEnv = {
  DATABASE_URL: 'postgresql://ticketbox:ticketbox@localhost:5432/ticketbox?schema=public',
  JWT_SECRET: 'test-secret',
  MOMO_PARTNER_CODE: 'momo-partner',
  MOMO_ACCESS_KEY: 'momo-access',
  MOMO_SECRET_KEY: 'momo-secret',
  VNPAY_TMN_CODE: 'vnpay-terminal',
  VNPAY_HASH_SECRET: 'vnpay-secret',
  S3_ENDPOINT: 'https://example-account.r2.cloudflarestorage.com',
  S3_REGION: 'auto',
  S3_BUCKET: 'ticketbox-assets',
  S3_ACCESS_KEY_ID: 'access-key',
  S3_SECRET_ACCESS_KEY: 'secret-key',
  S3_PUBLIC_BASE_URL: 'https://assets.example.com',
};

describe('storage env validation', () => {
  it('requires and accepts complete S3-compatible storage config', () => {
    const env = validateEnv(baseEnv);

    expect(env.S3_BUCKET).toBe('ticketbox-assets');
    expect(env.S3_PUBLIC_BASE_URL).toBe('https://assets.example.com');
  });

  it('fails when S3 storage config is missing', () => {
    const { S3_BUCKET, ...envWithoutBucket } = baseEnv;

    expect(() =>
      validateEnv(envWithoutBucket),
    ).toThrow(/S3_BUCKET: Required/);
  });
});
