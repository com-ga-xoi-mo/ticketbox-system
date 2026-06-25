import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import { PlatformConfigService } from '../../config/platform-config.service';
import { LocalObjectStorageAdapter } from '../adapters/local-object-storage.adapter';
import { OBJECT_STORAGE } from '../object-storage.port';
import { StorageModule } from '../storage.module';

describe('StorageModule', () => {
  it('compiles, creates the local adapter, and exposes a singleton OBJECT_STORAGE provider', async () => {
    const mockConfig = {
      storageDriver: 'local',
      localStorageRootDir: 'data/test',
      localStoragePublicBaseUrl: 'http://test',
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
      
      expect(first).toBeInstanceOf(LocalObjectStorageAdapter);
      expect(first).toBe(second);
    } finally {
      await moduleRef.close();
    }
  });
});
