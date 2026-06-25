import { Module } from '@nestjs/common';
import { BackendWorkerModule } from '@ticketbox/backend';

@Module({
  imports: [BackendWorkerModule],
})
export class WorkerAppModule {}
