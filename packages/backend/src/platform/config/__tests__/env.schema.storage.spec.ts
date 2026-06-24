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
};

describe('storage env validation', () => {
  it('defaults STORAGE_DRIVER to local', () => {
    const env = validateEnv(baseEnv);

    expect(env.STORAGE_DRIVER).toBe('local');
    expect(env.LOCAL_STORAGE_ROOT_DIR).toBe('data/uploads');
    expect(env.LOCAL_STORAGE_PUBLIC_BASE_URL).toBe('http://localhost:3000/storage');
  });

  it('allows local storage without S3 vars', () => {
    const env = validateEnv({
      ...baseEnv,
      STORAGE_DRIVER: 'local',
      S3_ENDPOINT: '',
      S3_REGION: '',
      S3_BUCKET: '',
      S3_ACCESS_KEY_ID: '',
      S3_SECRET_ACCESS_KEY: '',
      S3_PUBLIC_BASE_URL: '',
    });

    expect(env.STORAGE_DRIVER).toBe('local');
    expect(env.S3_BUCKET).toBeUndefined();
  });

  it('accepts complete S3-compatible storage config', () => {
    const env = validateEnv({
      ...baseEnv,
      STORAGE_DRIVER: 's3',
      S3_ENDPOINT: 'https://example-account.r2.cloudflarestorage.com',
      S3_REGION: 'auto',
      S3_BUCKET: 'ticketbox-assets',
      S3_ACCESS_KEY_ID: 'access-key',
      S3_SECRET_ACCESS_KEY: 'secret-key',
      S3_PUBLIC_BASE_URL: 'https://assets.example.com',
    });

    expect(env.STORAGE_DRIVER).toBe('s3');
    expect(env.S3_BUCKET).toBe('ticketbox-assets');
  });

  it('fails when S3 storage is missing required config', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        STORAGE_DRIVER: 's3',
        S3_ENDPOINT: 'https://example-account.r2.cloudflarestorage.com',
        S3_REGION: 'auto',
        S3_ACCESS_KEY_ID: 'access-key',
        S3_SECRET_ACCESS_KEY: 'secret-key',
        S3_PUBLIC_BASE_URL: 'https://assets.example.com',
      }),
    ).toThrow(/S3_BUCKET is required when STORAGE_DRIVER=s3/);
  });
});
