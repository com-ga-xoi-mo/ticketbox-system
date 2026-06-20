import { Module } from '@nestjs/common';
import { BackendCoreModule, HealthModule, OrderModule, PaymentModule } from '@ticketbox/backend';

@Module({
  imports: [BackendCoreModule, HealthModule, OrderModule, PaymentModule],
})
export class AppModule {}
