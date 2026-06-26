import { DynamicModule, Global, Module } from '@nestjs/common';

import { PlatformConfigModule } from '../config/platform-config.module';
import { PlatformConfigService } from '../config/platform-config.service';
import { S3CompatibleObjectStorageAdapter } from './adapters/s3-compatible-object-storage.adapter';
import { OBJECT_STORAGE } from './object-storage.port';

@Global()
@Module({})
export class StorageModule {
  static forRoot(): DynamicModule {
    return {
      module: StorageModule,
      imports: [PlatformConfigModule],
      providers: [
        {
          provide: OBJECT_STORAGE,
          inject: [PlatformConfigService],
          useFactory: (config: PlatformConfigService) =>
            new S3CompatibleObjectStorageAdapter(config),
        },
      ],
      exports: [OBJECT_STORAGE],
    };
  }
}
