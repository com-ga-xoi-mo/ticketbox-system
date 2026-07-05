import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../platform/database/database.module';
import { Subject } from 'rxjs';
import { JwtModule } from '@nestjs/jwt';
import { PlatformConfigModule } from '../platform/config/platform-config.module';
import { PlatformConfigService } from '../platform/config/platform-config.service';

import { RedisModule } from '../platform/redis/redis.module';

// Adapters
import { ResaleListingsController } from './adapters/http/resale-listings.controller';
import { ResaleSocialController } from './adapters/http/resale-social.controller';
import { ResaleTransferController } from './adapters/http/resale-transfer.controller';
import { ResaleTrustController } from './adapters/http/resale-trust.controller';
import { ResaleMessagingController } from './adapters/http/resale-messaging.controller';
import { ResaleTransactionController } from './adapters/http/resale-transaction.controller';
import { ResaleMessagingGateway } from './adapters/websocket/resale-messaging.gateway';

// Use Cases
import { CreateListingUseCase } from './application/use-cases/create-listing.use-case';
import { CancelListingUseCase } from './application/use-cases/cancel-listing.use-case';
import { GetFeedUseCase } from './application/use-cases/get-feed.use-case';
import { GetListingDetailUseCase } from './application/use-cases/get-listing-detail.use-case';
import { GetMyListingsUseCase } from './application/use-cases/get-my-listings.use-case';
import { ExecutePurchaseUseCase } from './application/use-cases/execute-purchase.use-case';
import { ToggleUpvoteUseCase, AddCommentUseCase, AddReplyUseCase, GetCommentsUseCase, FlagCommentUseCase } from './application/use-cases/social.use-cases';
import { SendMessageUseCase, GetMyThreadsUseCase, GetThreadMessagesUseCase } from './application/use-cases/messaging.use-cases';
import { GetSellerProfileUseCase, ComputeTrustScoreUseCase } from './application/use-cases/trust.use-cases';
import { GetMyTransactionsUseCase, ProcessPayoutUseCase } from './application/use-cases/transaction.use-cases';

// Infrastructure / Repositories
import { PrismaResaleListingRepository } from './infrastructure/database/prisma-resale-listing.repository';
import { PrismaResaleSocialRepository } from './infrastructure/database/prisma-resale-social.repository';
import { PrismaResaleMessagingRepository } from './infrastructure/database/prisma-resale-messaging.repository';
import { PrismaResaleTransferRepository } from './infrastructure/database/prisma-resale-transfer.repository';
import { PrismaResaleTrustRepository } from './infrastructure/database/prisma-resale-trust.repository';
import { PrismaResaleTicketProvider } from './infrastructure/database/prisma-resale-ticket-provider';
import { PrismaResaleTransactionRepository } from './infrastructure/database/prisma-resale-transaction.repository';

// Ports
import { RESALE_LISTING_REPOSITORY } from './domain/ports/resale-listing-repository.port';
import { RESALE_SOCIAL_REPOSITORY } from './domain/ports/resale-social-repository.port';
import { RESALE_MESSAGING_REPOSITORY } from './domain/ports/resale-messaging-repository.port';
import { RESALE_TRANSFER_REPOSITORY } from './domain/ports/resale-transfer-repository.port';
import { RESALE_TRUST_REPOSITORY } from './domain/ports/resale-trust-repository.port';
import { RESALE_TICKET_PROVIDER } from './domain/ports/resale-ticket-provider.port';
import { RESALE_TRANSACTION_REPOSITORY } from './domain/ports/resale-transaction-repository.port';

// Queue
import { ResaleListingExpiryProcessor } from './infrastructure/queue/listing-expiry.processor';
import { ResaleListingExpiryScheduler } from './infrastructure/queue/listing-expiry.scheduler';
import { ResaleTrustProcessor } from './infrastructure/queue/compute-trust.processor';

@Module({
  imports: [
    DatabaseModule,
    PlatformConfigModule,
    RedisModule,
    JwtModule.registerAsync({
      imports: [PlatformConfigModule],
      inject: [PlatformConfigService],
      useFactory: (config: PlatformConfigService) => ({ secret: config.jwtSecret }),
    }),
    BullModule.registerQueue(
      { name: 'compute-seller-trust' },
      { name: 'resale-listing-expiry' }
    ),
  ],
  controllers: [
    ResaleListingsController,
    ResaleSocialController,
    ResaleTransferController,
    ResaleTrustController,
    ResaleMessagingController,
    ResaleTransactionController
  ],
  providers: [
    // Gateways & Subject singletons
    ResaleMessagingGateway,
    { provide: 'SSE_SUBJECT', useValue: new Subject<any>() },
    { 
      provide: 'GATEWAY_SENDER',
      inject: [ResaleMessagingGateway],
      useFactory: (gateway: ResaleMessagingGateway) => (userId: string, payload: any) => gateway.sendMessageToUser(userId, payload)
    },

    // Repositories
    { provide: RESALE_LISTING_REPOSITORY, useClass: PrismaResaleListingRepository },
    { provide: RESALE_SOCIAL_REPOSITORY, useClass: PrismaResaleSocialRepository },
    { provide: RESALE_MESSAGING_REPOSITORY, useClass: PrismaResaleMessagingRepository },
    { provide: RESALE_TRANSFER_REPOSITORY, useClass: PrismaResaleTransferRepository },
    { provide: RESALE_TRUST_REPOSITORY, useClass: PrismaResaleTrustRepository },
    { provide: RESALE_TICKET_PROVIDER, useClass: PrismaResaleTicketProvider },
    { provide: RESALE_TRANSACTION_REPOSITORY, useClass: PrismaResaleTransactionRepository },

    // Use Cases
    CreateListingUseCase, CancelListingUseCase, GetFeedUseCase, GetListingDetailUseCase, GetMyListingsUseCase,
    ExecutePurchaseUseCase,
    ToggleUpvoteUseCase, AddCommentUseCase, AddReplyUseCase, GetCommentsUseCase, FlagCommentUseCase,
    SendMessageUseCase, GetMyThreadsUseCase, GetThreadMessagesUseCase,
    GetSellerProfileUseCase, ComputeTrustScoreUseCase,
    GetMyTransactionsUseCase, ProcessPayoutUseCase,

    // Queue / Processors
    ResaleListingExpiryProcessor, ResaleListingExpiryScheduler, ResaleTrustProcessor
  ],
  exports: [ResaleMessagingGateway],
})
export class ResaleModule {}
