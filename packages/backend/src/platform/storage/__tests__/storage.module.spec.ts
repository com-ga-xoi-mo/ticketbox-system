import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LocalObjectStorageAdapter } from '../adapters/local-object-storage.adapter';
import { OBJECT_STORAGE } from '../object-storage.port';
import { StorageModule } from '../storage.module';

describe('StorageModule', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://ticketbox:ticketbox@localhost:5432/ticketbox?schema=public';
    process.env.JWT_SECRET = 'test-secret';
    process.env.STORAGE_DRIVER = 'local';
    process.env.LOCAL_STORAGE_ROOT_DIR = 'data/test-uploads';
    process.env.LOCAL_STORAGE_PUBLIC_BASE_URL = 'http://localhost:3000/storage';
    process.env.S3_ENDPOINT = '';
    process.env.S3_REGION = '';
    process.env.S3_BUCKET = '';
    process.env.S3_ACCESS_KEY_ID = '';
    process.env.S3_SECRET_ACCESS_KEY = '';
    process.env.S3_PUBLIC_BASE_URL = '';
    process.env.MOMO_PARTNER_CODE = 'test';
    process.env.MOMO_ACCESS_KEY = 'test';
    process.env.MOMO_SECRET_KEY = 'test';
    process.env.MOMO_PUBLIC_KEY = 'test';
    process.env.VNPAY_TMN_CODE = 'test';
    process.env.VNPAY_HASH_SECRET = 'test';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('compiles, creates the local adapter, and exposes a singleton OBJECT_STORAGE provider', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [StorageModule.forRoot()],
    }).compile();

    try {
      const first = moduleRef.get(OBJECT_STORAGE);
      const second = moduleRef.get(OBJECT_STORAGE);
      
      expect(first).toBeInstanceOf(LocalObjectStorageAdapter);
      expect(first).toBe(second);
    } finally {
      await moduleRef.close();
    }
  });
});
