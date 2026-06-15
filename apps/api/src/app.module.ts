import { Module } from '@nestjs/common';
import { BackendCoreModule, HealthModule } from '../../../packages/backend/src';

@Module({
  imports: [BackendCoreModule, HealthModule],
})
export class AppModule {}
