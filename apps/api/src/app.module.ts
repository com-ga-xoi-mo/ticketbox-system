import { Module } from '@nestjs/common';
import { BackendCoreModule, HealthModule, OrderModule } from '@ticketbox/backend';

@Module({
  imports: [BackendCoreModule, HealthModule, OrderModule],
})
export class AppModule {}
