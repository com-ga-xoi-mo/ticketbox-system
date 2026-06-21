import { describe, expect, it } from 'vitest';
import { BackendCoreModule } from '../platform/backend-core.module';
import { BackendWorkerModule } from '../platform/backend-worker.module';
import {
  GuestListImportModule,
  GuestListImportProcessor,
  GuestListSchedulerService,
} from './guest-list-import.module';

describe('guest-list process composition', () => {
  it('wires HTTP providers into core and worker-only providers into the worker process', () => {
    const coreImports = Reflect.getMetadata('imports', BackendCoreModule) as unknown[];
    const workerProviders = Reflect.getMetadata('providers', BackendWorkerModule) as unknown[];
    expect(coreImports).toContain(GuestListImportModule);
    expect(workerProviders).toEqual(
      expect.arrayContaining([GuestListImportProcessor, GuestListSchedulerService]),
    );
  });
});
