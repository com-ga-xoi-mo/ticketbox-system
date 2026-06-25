import { Module } from '@nestjs/common';
import {
  AudienceSupportModule,
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
    AudienceSupportModule,
  ],
})
export class AppModule {}
