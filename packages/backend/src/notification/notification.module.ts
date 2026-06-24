import { Module } from '@nestjs/common';

import { DatabaseModule } from '../platform/database/database.module';
import { PlatformConfigModule } from '../platform/config/platform-config.module';
import { PlatformConfigService } from '../platform/config/platform-config.service';
import { QueueModule } from '../platform/queue/queue.module';
import { CreatePurchaseConfirmationNotificationsUseCase } from './application/use-cases/create-purchase-confirmation-notifications.use-case';
import { DeliverNotificationUseCase } from './application/use-cases/deliver-notification.use-case';
import { EnqueuePurchaseConfirmationUseCase } from './application/use-cases/enqueue-purchase-confirmation.use-case';
import { SendConcertRemindersUseCase } from './application/use-cases/send-concert-reminders.use-case';
import {
  CONCERT_REMINDER_READ_PORT,
  type ConcertReminderReadPort,
} from './domain/ports/concert-reminder-read.port';
import {
  EMAIL_NOTIFICATION_CHANNEL,
  type NotificationChannelPort,
} from './domain/ports/notification-channel.port';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepositoryPort,
} from './domain/ports/notification-repository.port';
import {
  PURCHASE_CONFIRMATION_QUEUE_PORT,
  type PurchaseConfirmationQueuePort,
} from './domain/ports/purchase-confirmation-queue.port';
import {
  PURCHASE_CONFIRMATION_READ_PORT,
  type PurchaseConfirmationReadPort,
} from './domain/ports/purchase-confirmation-read.port';
import { PrismaConcertReminderReadAdapter } from './infrastructure/database/prisma-concert-reminder-read.adapter';
import { PrismaNotificationRepository } from './infrastructure/database/prisma-notification.repository';
import { PrismaPurchaseConfirmationReadAdapter } from './infrastructure/database/prisma-purchase-confirmation-read.adapter';
import { createEmailChannelAdapter } from './infrastructure/email/email-channel.provider';
import { PurchaseConfirmationNotificationProducer } from './infrastructure/queue/purchase-confirmation-notification.producer';

@Module({
  imports: [PlatformConfigModule, DatabaseModule, QueueModule],
  providers: [
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: PrismaNotificationRepository,
    },
    {
      provide: CONCERT_REMINDER_READ_PORT,
      useClass: PrismaConcertReminderReadAdapter,
    },
    {
      provide: EMAIL_NOTIFICATION_CHANNEL,
      inject: [PlatformConfigService],
      useFactory: createEmailChannelAdapter,
    },
    {
      provide: PURCHASE_CONFIRMATION_READ_PORT,
      useClass: PrismaPurchaseConfirmationReadAdapter,
    },
    {
      provide: PURCHASE_CONFIRMATION_QUEUE_PORT,
      useExisting: PurchaseConfirmationNotificationProducer,
    },
    {
      provide: CreatePurchaseConfirmationNotificationsUseCase,
      inject: [NOTIFICATION_REPOSITORY],
      useFactory: (notificationRepository: NotificationRepositoryPort) =>
        new CreatePurchaseConfirmationNotificationsUseCase(notificationRepository),
    },
    {
      provide: DeliverNotificationUseCase,
      inject: [NOTIFICATION_REPOSITORY, EMAIL_NOTIFICATION_CHANNEL, PlatformConfigService],
      useFactory: (
        notificationRepository: NotificationRepositoryPort,
        emailChannel: NotificationChannelPort,
        config: PlatformConfigService,
      ) =>
        new DeliverNotificationUseCase(
          notificationRepository,
          emailChannel,
          config.emailMaxAttempts,
        ),
    },
    {
      provide: EnqueuePurchaseConfirmationUseCase,
      inject: [
        PURCHASE_CONFIRMATION_READ_PORT,
        PURCHASE_CONFIRMATION_QUEUE_PORT,
        PlatformConfigService,
      ],
      useFactory: (
        readPort: PurchaseConfirmationReadPort,
        queue: PurchaseConfirmationQueuePort,
        config: PlatformConfigService,
      ) =>
        new EnqueuePurchaseConfirmationUseCase(readPort, queue, config.ticketAccessBaseUrl),
    },
    {
      provide: SendConcertRemindersUseCase,
      inject: [CONCERT_REMINDER_READ_PORT, NOTIFICATION_REPOSITORY],
      useFactory: (
        readPort: ConcertReminderReadPort,
        notificationRepository: NotificationRepositoryPort,
      ) => new SendConcertRemindersUseCase(readPort, notificationRepository),
    },
    PurchaseConfirmationNotificationProducer,
  ],
  exports: [
    CreatePurchaseConfirmationNotificationsUseCase,
    DeliverNotificationUseCase,
    EnqueuePurchaseConfirmationUseCase,
    SendConcertRemindersUseCase,
    PurchaseConfirmationNotificationProducer,
    NOTIFICATION_REPOSITORY,
    EMAIL_NOTIFICATION_CHANNEL,
  ],
})
export class NotificationModule {}

export type { OrderPaidForNotification } from './domain/events/order-paid-for-notification.event';
export {
  NotificationAttemptStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from './domain/notification.types';
