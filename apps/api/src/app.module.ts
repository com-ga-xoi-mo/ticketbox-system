import { Module } from '@nestjs/common';
import {
  AudienceSupportModule,
  BackendCoreModule,
  ConcertManagementModule,
  HealthModule,
  OrderModule,
  PaymentModule,
} from '@ticketbox/backend';
import { GiftingController } from './gifting/gifting.controller';
import { PublicTransferController } from './gifting/public-transfer.controller';
import { GiftingModule } from '@ticketbox/backend/gifting/gifting.module';

@Module({
  imports: [
    BackendCoreModule,
    HealthModule,
    ConcertManagementModule,
    OrderModule,
    PaymentModule,
    AudienceSupportModule,
    GiftingModule,
  ],
  controllers: [GiftingController, PublicTransferController],
})
export class AppModule {}
