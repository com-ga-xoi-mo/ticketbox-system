import { Module } from '@nestjs/common';
import { BackendCoreModule, ConcertManagementModule, HealthModule } from '@ticketbox/backend';

@Module({
  imports: [BackendCoreModule, HealthModule, ConcertManagementModule],
})
export class AppModule {}
