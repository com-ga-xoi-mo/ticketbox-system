import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
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
import {
  WAITLIST_RELEASE_PUBLISHER,
} from '../ordering/domain/ports/waitlist-release-publisher.port';
import { OfficialWaitlistController } from './adapters/http/official-waitlist.controller';
import {
  ExpireWaitlistEntitlementsUseCase,
  GetWaitlistStatusUseCase,
  GrantWaitlistEntitlementsUseCase,
  JoinWaitlistUseCase,
  LeaveWaitlistUseCase,
  SendWaitlistEntitlementRemindersUseCase,
  type WaitlistGrantNotifier,
} from './application/use-cases/waitlist.use-cases';
import { WaitlistEntitlementEmailComposer } from './application/services/waitlist-entitlement-email-composer';
import {
  OFFICIAL_WAITLIST_REPOSITORY,
  type OfficialWaitlistRepositoryPort,
} from './domain/ports/official-waitlist-repository.port';
import { PrismaOfficialWaitlistRepository } from './infrastructure/database/prisma-official-waitlist.repository';
import { WaitlistNotificationService } from './infrastructure/notification/waitlist-notification.service';
import { OFFICIAL_WAITLIST_QUEUE } from './infrastructure/queue/official-waitlist-queue.constants';
import { WaitlistReleasePublisher } from './infrastructure/queue/waitlist-release.publisher';

export const WAITLIST_GRANT_NOTIFIER = Symbol('WaitlistGrantNotifier');

@Module({
  imports: [
    DatabaseModule,
    NotificationModule,
    PlatformConfigModule,
    QueueModule,
    BullModule.registerQueue({ name: OFFICIAL_WAITLIST_QUEUE }),
  ],
  controllers: [OfficialWaitlistController],
  providers: [
    {
      provide: OFFICIAL_WAITLIST_REPOSITORY,
      useClass: PrismaOfficialWaitlistRepository,
    },
    {
      provide: WAITLIST_GRANT_NOTIFIER,
      inject: [
        NOTIFICATION_REPOSITORY,
        OFFICIAL_WAITLIST_REPOSITORY,
        getQueueToken(NOTIFICATION_DELIVERY_QUEUE),
        WaitlistEntitlementEmailComposer,
        PlatformConfigService,
      ],
      useFactory: (
        notificationRepository: NotificationRepositoryPort,
        waitlistRepository: OfficialWaitlistRepositoryPort,
        deliveryQueue: Queue<NotificationDeliveryJobData>,
        emailComposer: WaitlistEntitlementEmailComposer,
        config: PlatformConfigService,
      ) =>
        new WaitlistNotificationService(
          notificationRepository,
          waitlistRepository,
          deliveryQueue,
          emailComposer,
          config,
        ),
    },
    {
      provide: WaitlistEntitlementEmailComposer,
      inject: [PlatformConfigService],
      useFactory: (config: PlatformConfigService) =>
        new WaitlistEntitlementEmailComposer(config.ticketAccessBaseUrl),
    },
    {
      provide: JoinWaitlistUseCase,
      inject: [OFFICIAL_WAITLIST_REPOSITORY],
      useFactory: (repository: OfficialWaitlistRepositoryPort) =>
        new JoinWaitlistUseCase(repository),
    },
    {
      provide: LeaveWaitlistUseCase,
      inject: [OFFICIAL_WAITLIST_REPOSITORY],
      useFactory: (repository: OfficialWaitlistRepositoryPort) =>
        new LeaveWaitlistUseCase(repository),
    },
    {
      provide: GetWaitlistStatusUseCase,
      inject: [OFFICIAL_WAITLIST_REPOSITORY],
      useFactory: (repository: OfficialWaitlistRepositoryPort) =>
        new GetWaitlistStatusUseCase(repository),
    },
    {
      provide: GrantWaitlistEntitlementsUseCase,
      inject: [
        OFFICIAL_WAITLIST_REPOSITORY,
        WAITLIST_GRANT_NOTIFIER,
        PlatformConfigService,
      ],
      useFactory: (
        repository: OfficialWaitlistRepositoryPort,
        notifier: WaitlistGrantNotifier,
        config: PlatformConfigService,
      ) =>
        new GrantWaitlistEntitlementsUseCase(
          repository,
          notifier,
          config.waitlistEntitlementTtlMinutes,
        ),
    },
    {
      provide: ExpireWaitlistEntitlementsUseCase,
      inject: [OFFICIAL_WAITLIST_REPOSITORY, GrantWaitlistEntitlementsUseCase],
      useFactory: (
        repository: OfficialWaitlistRepositoryPort,
        grantUseCase: GrantWaitlistEntitlementsUseCase,
      ) => new ExpireWaitlistEntitlementsUseCase(repository, grantUseCase),
    },
    {
      provide: SendWaitlistEntitlementRemindersUseCase,
      inject: [
        OFFICIAL_WAITLIST_REPOSITORY,
        WAITLIST_GRANT_NOTIFIER,
      ],
      useFactory: (
        repository: OfficialWaitlistRepositoryPort,
        notifier: WaitlistGrantNotifier,
      ) => new SendWaitlistEntitlementRemindersUseCase(repository, notifier, 5),
    },
    {
      provide: WAITLIST_RELEASE_PUBLISHER,
      useClass: WaitlistReleasePublisher,
    },
  ],
  exports: [
    WAITLIST_RELEASE_PUBLISHER,
    OFFICIAL_WAITLIST_REPOSITORY,
    GrantWaitlistEntitlementsUseCase,
    ExpireWaitlistEntitlementsUseCase,
    SendWaitlistEntitlementRemindersUseCase,
  ],
})
export class OfficialWaitlistModule {}
