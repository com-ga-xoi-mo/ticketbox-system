import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { NotificationModule } from '../notification/notification.module';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepositoryPort,
} from '../notification/domain/ports/notification-repository.port';
import { PlatformConfigModule } from '../platform/config/platform-config.module';
import { PlatformConfigService } from '../platform/config/platform-config.service';
import { DatabaseModule } from '../platform/database/database.module';
import { QrTicketTokenService } from '../ordering/domain/qr-ticket-token.service';
import { AudienceSupportController } from './adapters/http/audience-support.controller';
import {
  CreateRefundRequestUseCase,
  CreateSupportRequestUseCase,
  GetOrderConfirmationUseCase,
  GetRefundEligibilityUseCase,
  GetRefundRequestUseCase,
  GetSupportRequestUseCase,
  GetTicketDownloadUseCase,
  ListRefundRequestsUseCase,
  ListSupportRequestsUseCase,
  ResendTicketsUseCase,
} from './application/audience-support.use-cases';
import {
  AUDIENCE_SUPPORT_REPOSITORY,
  type AudienceSupportRepositoryPort,
} from './domain/ports/audience-support-repository.port';
import { PrismaAudienceSupportRepository } from './infrastructure/database/prisma-audience-support.repository';

@Module({
  imports: [AuthModule, DatabaseModule, NotificationModule, PlatformConfigModule],
  controllers: [AudienceSupportController],
  providers: [
    {
      provide: AUDIENCE_SUPPORT_REPOSITORY,
      useClass: PrismaAudienceSupportRepository,
    },
    {
      provide: QrTicketTokenService,
      inject: [PlatformConfigService],
      useFactory: (config: PlatformConfigService) =>
        new QrTicketTokenService(config.qrTokenSecret),
    },
    {
      provide: CreateSupportRequestUseCase,
      inject: [AUDIENCE_SUPPORT_REPOSITORY, NOTIFICATION_REPOSITORY],
      useFactory: (
        repository: AudienceSupportRepositoryPort,
        notificationRepository: NotificationRepositoryPort,
      ) => new CreateSupportRequestUseCase(repository, notificationRepository),
    },
    {
      provide: ListSupportRequestsUseCase,
      inject: [AUDIENCE_SUPPORT_REPOSITORY],
      useFactory: (repository: AudienceSupportRepositoryPort) =>
        new ListSupportRequestsUseCase(repository),
    },
    {
      provide: GetSupportRequestUseCase,
      inject: [AUDIENCE_SUPPORT_REPOSITORY],
      useFactory: (repository: AudienceSupportRepositoryPort) =>
        new GetSupportRequestUseCase(repository),
    },
    {
      provide: GetRefundEligibilityUseCase,
      inject: [AUDIENCE_SUPPORT_REPOSITORY],
      useFactory: (repository: AudienceSupportRepositoryPort) =>
        new GetRefundEligibilityUseCase(repository),
    },
    {
      provide: CreateRefundRequestUseCase,
      inject: [
        AUDIENCE_SUPPORT_REPOSITORY,
        GetRefundEligibilityUseCase,
        NOTIFICATION_REPOSITORY,
      ],
      useFactory: (
        repository: AudienceSupportRepositoryPort,
        eligibility: GetRefundEligibilityUseCase,
        notificationRepository: NotificationRepositoryPort,
      ) => new CreateRefundRequestUseCase(repository, eligibility, notificationRepository),
    },
    {
      provide: ListRefundRequestsUseCase,
      inject: [AUDIENCE_SUPPORT_REPOSITORY],
      useFactory: (repository: AudienceSupportRepositoryPort) =>
        new ListRefundRequestsUseCase(repository),
    },
    {
      provide: GetRefundRequestUseCase,
      inject: [AUDIENCE_SUPPORT_REPOSITORY],
      useFactory: (repository: AudienceSupportRepositoryPort) =>
        new GetRefundRequestUseCase(repository),
    },
    {
      provide: ResendTicketsUseCase,
      inject: [AUDIENCE_SUPPORT_REPOSITORY, NOTIFICATION_REPOSITORY],
      useFactory: (
        repository: AudienceSupportRepositoryPort,
        notificationRepository: NotificationRepositoryPort,
      ) => new ResendTicketsUseCase(repository, notificationRepository),
    },
    {
      provide: GetTicketDownloadUseCase,
      inject: [AUDIENCE_SUPPORT_REPOSITORY, QrTicketTokenService],
      useFactory: (
        repository: AudienceSupportRepositoryPort,
        qrTicketTokenService: QrTicketTokenService,
      ) => new GetTicketDownloadUseCase(repository, qrTicketTokenService),
    },
    {
      provide: GetOrderConfirmationUseCase,
      inject: [AUDIENCE_SUPPORT_REPOSITORY],
      useFactory: (repository: AudienceSupportRepositoryPort) =>
        new GetOrderConfirmationUseCase(repository),
    },
  ],
  exports: [
    CreateSupportRequestUseCase,
    ListSupportRequestsUseCase,
    GetSupportRequestUseCase,
    GetRefundEligibilityUseCase,
    CreateRefundRequestUseCase,
    ListRefundRequestsUseCase,
    GetRefundRequestUseCase,
    ResendTicketsUseCase,
    GetTicketDownloadUseCase,
    GetOrderConfirmationUseCase,
  ],
})
export class AudienceSupportModule {}
