import { Module } from '@nestjs/common';
import { BackendWorkerModule } from '../../../packages/backend/src';

@Module({
  imports: [BackendWorkerModule],
})
export class WorkerAppModule {}
