import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import { PlatformConfigService } from '../../config/platform-config.service';
import { S3CompatibleObjectStorageAdapter } from '../adapters/s3-compatible-object-storage.adapter';
import { OBJECT_STORAGE } from '../object-storage.port';
import { StorageModule } from '../storage.module';

describe('StorageModule', () => {
  it('compiles, creates the S3 adapter, and exposes a singleton OBJECT_STORAGE provider', async () => {
    const mockConfig = {
      s3Endpoint: 'https://example-account.r2.cloudflarestorage.com',
      s3Region: 'auto',
      s3Bucket: 'ticketbox-assets',
      s3AccessKeyId: 'access-key',
      s3SecretAccessKey: 'secret-key',
      s3PublicBaseUrl: 'https://assets.example.com',
    };

    const moduleRef = await Test.createTestingModule({
      imports: [StorageModule.forRoot()],
    })
      .overrideProvider(PlatformConfigService)
      .useValue(mockConfig)
      .compile();

    try {
      const first = moduleRef.get(OBJECT_STORAGE);
      const second = moduleRef.get(OBJECT_STORAGE);
      
      expect(first).toBeInstanceOf(S3CompatibleObjectStorageAdapter);
      expect(first).toBe(second);
    } finally {
      await moduleRef.close();
    }
  });
});
