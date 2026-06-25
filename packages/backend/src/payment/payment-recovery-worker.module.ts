import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { QueueModule } from '../platform/queue/queue.module';
import { PaymentModule } from './payment.module';
import { PAYMENT_RECOVERY_QUEUE } from './infrastructure/queue/payment-recovery-queue.constants';
import { SuccessfulPaymentRepairProcessor } from './infrastructure/queue/successful-payment-repair.processor';

@Module({
  imports: [
    PaymentModule,
    QueueModule,
    BullModule.registerQueue({ name: PAYMENT_RECOVERY_QUEUE }),
  ],
  providers: [SuccessfulPaymentRepairProcessor],
})
export class PaymentRecoveryWorkerModule {}
