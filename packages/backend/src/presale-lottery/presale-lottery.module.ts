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
import { LotteryEntitlementEmailComposer } from './application/services/lottery-entitlement-email-composer';
import {
  CancelLotteryUseCase,
  ConfigureLotteryUseCase,
  ExpireLotteryEntitlementsUseCase,
  GetLotteryConfigUseCase,
  GetLotteryStatusUseCase,
  ListLotteryRegistrationsUseCase,
  RegisterForLotteryUseCase,
  RunDueLotteryDrawsUseCase,
  RunLotteryDrawUseCase,
  SendLotteryEntitlementRemindersUseCase,
  UpdateLotteryTtlUseCase,
  WithdrawLotteryRegistrationUseCase,
  type LotteryGrantNotifier,
} from './application/use-cases/lottery.use-cases';
import {
  PRESALE_LOTTERY_REPOSITORY,
  type PresaleLotteryRepositoryPort,
} from './domain/ports/presale-lottery-repository.port';
import { PrismaPresaleLotteryRepository } from './infrastructure/database/prisma-presale-lottery.repository';
import { LotteryNotificationService } from './infrastructure/notification/lottery-notification.service';

export const LOTTERY_GRANT_NOTIFIER = Symbol('LotteryGrantNotifier');

@Module({
  imports: [DatabaseModule, NotificationModule, PlatformConfigModule, QueueModule],
  controllers: [PresaleLotteryController, OrganizerLotteryController],
  providers: [
    {
      provide: PRESALE_LOTTERY_REPOSITORY,
      useClass: PrismaPresaleLotteryRepository,
    },
    {
      provide: LotteryEntitlementEmailComposer,
      inject: [PlatformConfigService],
      useFactory: (config: PlatformConfigService) =>
        new LotteryEntitlementEmailComposer(config.ticketAccessBaseUrl),
    },
    {
      provide: LOTTERY_GRANT_NOTIFIER,
      inject: [
        NOTIFICATION_REPOSITORY,
        PRESALE_LOTTERY_REPOSITORY,
        getQueueToken(NOTIFICATION_DELIVERY_QUEUE),
        LotteryEntitlementEmailComposer,
        PlatformConfigService,
      ],
      useFactory: (
        notificationRepository: NotificationRepositoryPort,
        lotteryRepository: PresaleLotteryRepositoryPort,
        deliveryQueue: Queue<NotificationDeliveryJobData>,
        emailComposer: LotteryEntitlementEmailComposer,
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
      provide: UpdateLotteryTtlUseCase,
      inject: [PRESALE_LOTTERY_REPOSITORY],
      useFactory: (repository: PresaleLotteryRepositoryPort) =>
        new UpdateLotteryTtlUseCase(repository),
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
      inject: [PRESALE_LOTTERY_REPOSITORY, LOTTERY_GRANT_NOTIFIER],
      useFactory: (
        repository: PresaleLotteryRepositoryPort,
        notifier: LotteryGrantNotifier,
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
    {
      provide: ExpireLotteryEntitlementsUseCase,
      inject: [PRESALE_LOTTERY_REPOSITORY],
      useFactory: (repository: PresaleLotteryRepositoryPort) =>
        new ExpireLotteryEntitlementsUseCase(repository),
    },
    {
      provide: SendLotteryEntitlementRemindersUseCase,
      inject: [PRESALE_LOTTERY_REPOSITORY, LOTTERY_GRANT_NOTIFIER],
      useFactory: (
        repository: PresaleLotteryRepositoryPort,
        notifier: LotteryGrantNotifier,
      ) => new SendLotteryEntitlementRemindersUseCase(repository, notifier, 5),
    },
  ],
  exports: [
    PRESALE_LOTTERY_REPOSITORY,
    RunLotteryDrawUseCase,
    RunDueLotteryDrawsUseCase,
    ExpireLotteryEntitlementsUseCase,
    SendLotteryEntitlementRemindersUseCase,
  ],
})
export class PresaleLotteryModule {}
