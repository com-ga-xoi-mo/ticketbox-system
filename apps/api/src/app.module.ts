import { Module } from '@nestjs/common';
import { BackendCoreModule, HealthModule } from '@ticketbox/backend';

@Module({
  imports: [BackendCoreModule, HealthModule],
})
export class AppModule {}
