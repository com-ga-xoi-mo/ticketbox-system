import { getQueueToken } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import type { Queue } from 'bullmq';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepositoryPort,
} from '../notification/domain/ports/notification-repository.port';
import { NotificationModule } from '../notification/notification.module';
import type { NotificationDeliveryJobData } from '../notification/infrastructure/queue/notification-job.types';
import { NOTIFICATION_DELIVERY_QUEUE } from '../platform/queue/platform-queue.constants';
import { PlatformConfigModule } from '../platform/config/platform-config.module';
import { PlatformConfigService } from '../platform/config/platform-config.service';
import { DatabaseModule } from '../platform/database/database.module';
import { QueueModule } from '../platform/queue/queue.module';
import { OrganizerLotteryController } from './adapters/http/organizer-lottery.controller';
import { PresaleLotteryController } from './adapters/http/presale-lottery.controller';
import { LotteryWinnerEmailComposer } from './application/services/lottery-entitlement-email-composer';
import {
  CancelLotteryUseCase,
  ConfigureLotteryUseCase,
  GetLotteryConfigUseCase,
  GetLotteryStatusUseCase,
  ListLotteryRegistrationsUseCase,
  RegisterForLotteryUseCase,
  RunDueLotteryDrawsUseCase,
  RunLotteryDrawUseCase,
  WithdrawLotteryRegistrationUseCase,
  type LotteryDrawNotifier,
} from './application/use-cases/lottery.use-cases';
import {
  PRESALE_LOTTERY_REPOSITORY,
  type PresaleLotteryRepositoryPort,
} from './domain/ports/presale-lottery-repository.port';
import { PrismaPresaleLotteryRepository } from './infrastructure/database/prisma-presale-lottery.repository';
import { LotteryNotificationService } from './infrastructure/notification/lottery-notification.service';

export const LOTTERY_DRAW_NOTIFIER = Symbol('LotteryDrawNotifier');

@Module({
  imports: [DatabaseModule, NotificationModule, PlatformConfigModule, QueueModule],
  controllers: [PresaleLotteryController, OrganizerLotteryController],
  providers: [
    {
      provide: PRESALE_LOTTERY_REPOSITORY,
      useClass: PrismaPresaleLotteryRepository,
    },
    {
      provide: LotteryWinnerEmailComposer,
      inject: [PlatformConfigService],
      useFactory: (config: PlatformConfigService) =>
        new LotteryWinnerEmailComposer(config.ticketAccessBaseUrl),
    },
    {
      provide: LOTTERY_DRAW_NOTIFIER,
      inject: [
        NOTIFICATION_REPOSITORY,
        PRESALE_LOTTERY_REPOSITORY,
        getQueueToken(NOTIFICATION_DELIVERY_QUEUE),
        LotteryWinnerEmailComposer,
        PlatformConfigService,
      ],
      useFactory: (
        notificationRepository: NotificationRepositoryPort,
        lotteryRepository: PresaleLotteryRepositoryPort,
        deliveryQueue: Queue<NotificationDeliveryJobData>,
        emailComposer: LotteryWinnerEmailComposer,
        config: PlatformConfigService,
      ) =>
        new LotteryNotificationService(
          notificationRepository,
          lotteryRepository,
          deliveryQueue,
          emailComposer,
          config,
        ),
    },
    {
      provide: ConfigureLotteryUseCase,
      inject: [PRESALE_LOTTERY_REPOSITORY],
      useFactory: (repository: PresaleLotteryRepositoryPort) =>
        new ConfigureLotteryUseCase(repository),
    },
    {
      provide: CancelLotteryUseCase,
      inject: [PRESALE_LOTTERY_REPOSITORY],
      useFactory: (repository: PresaleLotteryRepositoryPort) =>
        new CancelLotteryUseCase(repository),
    },
    {
      provide: GetLotteryConfigUseCase,
      inject: [PRESALE_LOTTERY_REPOSITORY],
      useFactory: (repository: PresaleLotteryRepositoryPort) =>
        new GetLotteryConfigUseCase(repository),
    },
    {
      provide: ListLotteryRegistrationsUseCase,
      inject: [PRESALE_LOTTERY_REPOSITORY],
      useFactory: (repository: PresaleLotteryRepositoryPort) =>
        new ListLotteryRegistrationsUseCase(repository),
    },
    {
      provide: RegisterForLotteryUseCase,
      inject: [PRESALE_LOTTERY_REPOSITORY],
      useFactory: (repository: PresaleLotteryRepositoryPort) =>
        new RegisterForLotteryUseCase(repository),
    },
    {
      provide: WithdrawLotteryRegistrationUseCase,
      inject: [PRESALE_LOTTERY_REPOSITORY],
      useFactory: (repository: PresaleLotteryRepositoryPort) =>
        new WithdrawLotteryRegistrationUseCase(repository),
    },
    {
      provide: GetLotteryStatusUseCase,
      inject: [PRESALE_LOTTERY_REPOSITORY],
      useFactory: (repository: PresaleLotteryRepositoryPort) =>
        new GetLotteryStatusUseCase(repository),
    },
    {
      provide: RunLotteryDrawUseCase,
      inject: [PRESALE_LOTTERY_REPOSITORY, LOTTERY_DRAW_NOTIFIER],
      useFactory: (
        repository: PresaleLotteryRepositoryPort,
        notifier: LotteryDrawNotifier,
      ) => new RunLotteryDrawUseCase(repository, notifier),
    },
    {
      provide: RunDueLotteryDrawsUseCase,
      inject: [PRESALE_LOTTERY_REPOSITORY, RunLotteryDrawUseCase],
      useFactory: (
        repository: PresaleLotteryRepositoryPort,
        runDraw: RunLotteryDrawUseCase,
      ) => new RunDueLotteryDrawsUseCase(repository, runDraw),
    },
  ],
  exports: [
    PRESALE_LOTTERY_REPOSITORY,
    RunLotteryDrawUseCase,
    RunDueLotteryDrawsUseCase,
  ],
})
export class PresaleLotteryModule {}
