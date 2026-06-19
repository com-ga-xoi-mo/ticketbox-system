import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LocalObjectStorageAdapter } from '../adapters/local-object-storage.adapter';
import { OBJECT_STORAGE } from '../object-storage.port';
import { StorageModule } from '../storage.module';

describe('StorageModule', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      DATABASE_URL: 'postgresql://ticketbox:ticketbox@localhost:5432/ticketbox?schema=public',
      JWT_SECRET: 'test-secret',
      STORAGE_DRIVER: 'local',
      LOCAL_STORAGE_ROOT_DIR: 'data/test-uploads',
      LOCAL_STORAGE_PUBLIC_BASE_URL: 'http://localhost:3000/storage',
      S3_ENDPOINT: '',
      S3_REGION: '',
      S3_BUCKET: '',
      S3_ACCESS_KEY_ID: '',
      S3_SECRET_ACCESS_KEY: '',
      S3_PUBLIC_BASE_URL: '',
    };
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
