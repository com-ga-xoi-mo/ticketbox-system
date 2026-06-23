import { Module } from '@nestjs/common';
import {
  BackendCoreModule,
  ConcertManagementModule,
  HealthModule,
  OrderModule,
  PaymentModule,
} from '@ticketbox/backend';

@Module({
  imports: [
    BackendCoreModule,
    HealthModule,
    ConcertManagementModule,
    OrderModule,
    PaymentModule,
  ],
})
export class AppModule {}
