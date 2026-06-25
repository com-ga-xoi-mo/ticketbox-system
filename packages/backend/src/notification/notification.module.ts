import { Module } from '@nestjs/common';

import { QrTicketTokenService } from '../ordering/domain/qr-ticket-token.service';
import { DatabaseModule } from '../platform/database/database.module';
import { PlatformConfigModule } from '../platform/config/platform-config.module';
import { PlatformConfigService } from '../platform/config/platform-config.service';
import { QueueModule } from '../platform/queue/queue.module';
import { CreatePurchaseConfirmationNotificationsUseCase } from './application/use-cases/create-purchase-confirmation-notifications.use-case';
import { DeliverNotificationUseCase } from './application/use-cases/deliver-notification.use-case';
import { EnqueuePurchaseConfirmationUseCase } from './application/use-cases/enqueue-purchase-confirmation.use-case';
import { SendConcertRemindersUseCase } from './application/use-cases/send-concert-reminders.use-case';
import {
  GetAudienceUnreadNotificationCountUseCase,
  ListAudienceNotificationsUseCase,
  MarkAllAudienceNotificationsReadUseCase,
  MarkAudienceNotificationReadUseCase,
} from './application/use-cases/audience-notification-inbox.use-cases';
import { PurchaseConfirmationEmailComposer } from './application/services/purchase-confirmation-email-composer';
import { AudienceNotificationController } from './adapters/http/audience-notification.controller';
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
import {
  PURCHASE_CONFIRMATION_TICKET_READ_PORT,
  type PurchaseConfirmationTicketReadPort,
} from './domain/ports/purchase-confirmation-ticket-read.port';
import { QR_IMAGE_RENDERER, type QrImageRendererPort } from './domain/ports/qr-image-renderer.port';
import { PrismaConcertReminderReadAdapter } from './infrastructure/database/prisma-concert-reminder-read.adapter';
import { PrismaNotificationRepository } from './infrastructure/database/prisma-notification.repository';
import { PrismaPurchaseConfirmationReadAdapter } from './infrastructure/database/prisma-purchase-confirmation-read.adapter';
import { PrismaPurchaseConfirmationTicketReadAdapter } from './infrastructure/database/prisma-purchase-confirmation-ticket-read.adapter';
import { createEmailChannelAdapter } from './infrastructure/email/email-channel.provider';
import { QrcodePngRenderer } from './infrastructure/qr/qrcode-png-renderer';
import { PurchaseConfirmationNotificationProducer } from './infrastructure/queue/purchase-confirmation-notification.producer';

@Module({
  imports: [PlatformConfigModule, DatabaseModule, QueueModule],
  controllers: [AudienceNotificationController],
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
      provide: PURCHASE_CONFIRMATION_TICKET_READ_PORT,
      useClass: PrismaPurchaseConfirmationTicketReadAdapter,
    },
    {
      provide: QR_IMAGE_RENDERER,
      useClass: QrcodePngRenderer,
    },
    {
      provide: QrTicketTokenService,
      inject: [PlatformConfigService],
      useFactory: (config: PlatformConfigService) => new QrTicketTokenService(config.qrTokenSecret),
    },
    {
      provide: PurchaseConfirmationEmailComposer,
      inject: [PURCHASE_CONFIRMATION_TICKET_READ_PORT, QrTicketTokenService, QR_IMAGE_RENDERER],
      useFactory: (
        ticketReadPort: PurchaseConfirmationTicketReadPort,
        qrTicketTokenService: QrTicketTokenService,
        qrImageRenderer: QrImageRendererPort,
      ) =>
        new PurchaseConfirmationEmailComposer(
          ticketReadPort,
          qrTicketTokenService,
          qrImageRenderer,
        ),
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
      inject: [
        NOTIFICATION_REPOSITORY,
        EMAIL_NOTIFICATION_CHANNEL,
        PlatformConfigService,
        PurchaseConfirmationEmailComposer,
      ],
      useFactory: (
        notificationRepository: NotificationRepositoryPort,
        emailChannel: NotificationChannelPort,
        config: PlatformConfigService,
        purchaseConfirmationComposer: PurchaseConfirmationEmailComposer,
      ) =>
        new DeliverNotificationUseCase(
          notificationRepository,
          emailChannel,
          config.emailMaxAttempts,
          purchaseConfirmationComposer,
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
      ) => new EnqueuePurchaseConfirmationUseCase(readPort, queue, config.ticketAccessBaseUrl),
    },
    {
      provide: SendConcertRemindersUseCase,
      inject: [CONCERT_REMINDER_READ_PORT, NOTIFICATION_REPOSITORY],
      useFactory: (
        readPort: ConcertReminderReadPort,
        notificationRepository: NotificationRepositoryPort,
      ) => new SendConcertRemindersUseCase(readPort, notificationRepository),
    },
    {
      provide: ListAudienceNotificationsUseCase,
      inject: [NOTIFICATION_REPOSITORY],
      useFactory: (notificationRepository: NotificationRepositoryPort) =>
        new ListAudienceNotificationsUseCase(notificationRepository),
    },
    {
      provide: GetAudienceUnreadNotificationCountUseCase,
      inject: [NOTIFICATION_REPOSITORY],
      useFactory: (notificationRepository: NotificationRepositoryPort) =>
        new GetAudienceUnreadNotificationCountUseCase(notificationRepository),
    },
    {
      provide: MarkAudienceNotificationReadUseCase,
      inject: [NOTIFICATION_REPOSITORY],
      useFactory: (notificationRepository: NotificationRepositoryPort) =>
        new MarkAudienceNotificationReadUseCase(notificationRepository),
    },
    {
      provide: MarkAllAudienceNotificationsReadUseCase,
      inject: [NOTIFICATION_REPOSITORY],
      useFactory: (notificationRepository: NotificationRepositoryPort) =>
        new MarkAllAudienceNotificationsReadUseCase(notificationRepository),
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
