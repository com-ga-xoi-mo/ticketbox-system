import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { QueueModule } from '../platform/queue/queue.module';
import { ExpireReservationsUseCase } from './application/use-cases/expire-reservations.use-case';
import { TransitionOrderStatusUseCase } from './application/use-cases/transition-order-status.use-case';
import {
  EXPIRED_ORDER_REPOSITORY,
  type IExpiredOrderRepository,
} from './domain/ports/expired-order-repository.port';
import { PrismaExpiredOrderRepository } from './infrastructure/database/prisma-expired-order.repository';
import { ExpiredReservationProcessor } from './infrastructure/queue/expired-reservation.processor';
import { ORDER_EXPIRATION_QUEUE } from './infrastructure/queue/order-expiration-queue.constants';
import { OrderModule } from './order.module';

@Module({
  imports: [
    OrderModule,
    QueueModule,
    BullModule.registerQueue({
      name: ORDER_EXPIRATION_QUEUE,
    }),
  ],
  providers: [
    {
      provide: EXPIRED_ORDER_REPOSITORY,
      useClass: PrismaExpiredOrderRepository,
    },
    {
      provide: ExpireReservationsUseCase,
      inject: [EXPIRED_ORDER_REPOSITORY, TransitionOrderStatusUseCase],
      useFactory: (
        expiredOrderRepository: IExpiredOrderRepository,
        transitionOrderStatusUseCase: TransitionOrderStatusUseCase,
      ) =>
        new ExpireReservationsUseCase(
          expiredOrderRepository,
          transitionOrderStatusUseCase,
        ),
    },
    ExpiredReservationProcessor,
  ],
})
export class OrderingWorkerModule {}
