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
import {
  ToggleUpvoteUseCase,
  AddCommentUseCase,
  AddReplyUseCase,
  GetCommentsUseCase,
  FlagCommentUseCase,
} from './application/use-cases/social.use-cases';
import {
  SendMessageUseCase,
  GetMyThreadsUseCase,
  GetThreadMessagesUseCase,
} from './application/use-cases/messaging.use-cases';
import {
  GetSellerProfileUseCase,
  ComputeTrustScoreUseCase,
} from './application/use-cases/trust.use-cases';
import {
  GetMyTransactionsUseCase,
  ProcessPayoutUseCase,
} from './application/use-cases/transaction.use-cases';

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
import { UsersModule } from '../users/users.module';

// Queue
import { ResaleListingExpiryProcessor } from './infrastructure/queue/listing-expiry.processor';
import { ResaleListingExpiryScheduler } from './infrastructure/queue/listing-expiry.scheduler';
import { ResaleTrustProcessor } from './infrastructure/queue/compute-trust.processor';

// P2P Order
import { ResaleOrderController } from './adapters/http/p2p-order/resale-order.controller';
import { AdminResaleOrderController } from './adapters/http/admin-resale-order.controller';
import { InitiateP2POrderUseCase } from './application/use-cases/p2p-order/initiate-p2p-order.use-case';
import { ConfirmPaymentUseCase } from './application/use-cases/p2p-order/confirm-payment.use-case';
import { ConfirmReceiptUseCase } from './application/use-cases/p2p-order/confirm-receipt.use-case';
import { CancelP2POrderUseCase } from './application/use-cases/p2p-order/cancel-p2p-order.use-case';
import { RaiseDisputeUseCase } from './application/use-cases/p2p-order/raise-dispute.use-case';
import { GetP2POrderUseCase } from './application/use-cases/p2p-order/get-p2p-order.use-case';
import { ResolveDisputeUseCase } from './application/use-cases/p2p-order/resolve-dispute.use-case';
import { PrismaResaleOrderRepository } from './infrastructure/database/p2p-order/prisma-resale-order.repository';
import { RESALE_ORDER_REPOSITORY } from './domain/ports/p2p-order/resale-order-repository.port';

import { ResaleOrderReservedExpiryProcessor } from './infrastructure/queue/order-reserved-expiry.processor';
import { ResaleOrderConfirmExpiryProcessor } from './infrastructure/queue/order-confirm-expiry.processor';
import { APP_FILTER } from '@nestjs/core';
import { ResaleDomainErrorFilter } from './adapters/http/filters/resale-domain-error.filter';

import { EVENT_PUBLISHER } from './domain/ports/event-publisher.port';
import { BullmqEventPublisher } from './infrastructure/queue/bullmq-event-publisher';
import { PaymentProofImageValidator } from './application/services/payment-proof-image-validator';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    DatabaseModule,
    PlatformConfigModule,
    RedisModule,
    UsersModule,
    NotificationModule,
    JwtModule.registerAsync({
      imports: [PlatformConfigModule],
      inject: [PlatformConfigService],
      useFactory: (config: PlatformConfigService) => ({ secret: config.jwtSecret }),
    }),
    BullModule.registerQueue(
      {
        name: 'compute-seller-trust',
        defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      },
      {
        name: 'resale-listing-expiry',
        defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      },
      {
        name: 'resale.order.reserved.expiry',
        defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      },
      {
        name: 'resale.order.confirm.expiry',
        defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      },
    ),
  ],
  controllers: [
    ResaleListingsController,
    ResaleSocialController,
    ResaleTransferController,
    ResaleTrustController,
    ResaleMessagingController,
    ResaleTransactionController,
    ResaleOrderController,
    AdminResaleOrderController,
  ],
  providers: [
    // Gateways & Subject singletons
    ResaleMessagingGateway,
    { provide: 'SSE_SUBJECT', useValue: new Subject<any>() },
    {
      provide: 'GATEWAY_SENDER',
      inject: [ResaleMessagingGateway],
      useFactory: (gateway: ResaleMessagingGateway) => (userId: string, payload: any) =>
        gateway.sendMessageToUser(userId, payload),
    },

    // Repositories
    { provide: RESALE_ORDER_REPOSITORY, useClass: PrismaResaleOrderRepository },
    { provide: RESALE_LISTING_REPOSITORY, useClass: PrismaResaleListingRepository },
    { provide: RESALE_SOCIAL_REPOSITORY, useClass: PrismaResaleSocialRepository },
    { provide: RESALE_MESSAGING_REPOSITORY, useClass: PrismaResaleMessagingRepository },
    { provide: RESALE_TRANSFER_REPOSITORY, useClass: PrismaResaleTransferRepository },
    { provide: RESALE_TRUST_REPOSITORY, useClass: PrismaResaleTrustRepository },
    { provide: RESALE_TICKET_PROVIDER, useClass: PrismaResaleTicketProvider },
    { provide: RESALE_TRANSACTION_REPOSITORY, useClass: PrismaResaleTransactionRepository },
    { provide: EVENT_PUBLISHER, useClass: BullmqEventPublisher },
    { provide: APP_FILTER, useClass: ResaleDomainErrorFilter },

    // Use Cases
    InitiateP2POrderUseCase,
    ConfirmPaymentUseCase,
    PaymentProofImageValidator,
    ConfirmReceiptUseCase,
    CancelP2POrderUseCase,
    RaiseDisputeUseCase,
    GetP2POrderUseCase,
    ResolveDisputeUseCase,
    CreateListingUseCase,
    CancelListingUseCase,
    GetFeedUseCase,
    GetListingDetailUseCase,
    GetMyListingsUseCase,
    ExecutePurchaseUseCase,
    ToggleUpvoteUseCase,
    AddCommentUseCase,
    AddReplyUseCase,
    GetCommentsUseCase,
    FlagCommentUseCase,
    SendMessageUseCase,
    GetMyThreadsUseCase,
    GetThreadMessagesUseCase,
    GetSellerProfileUseCase,
    ComputeTrustScoreUseCase,
    GetMyTransactionsUseCase,
    ProcessPayoutUseCase,

    // Queue / Processors
    ResaleListingExpiryProcessor,
    ResaleListingExpiryScheduler,
    ResaleTrustProcessor,
    ResaleOrderReservedExpiryProcessor,
    ResaleOrderConfirmExpiryProcessor,
  ],
  exports: [ResaleMessagingGateway],
})
export class ResaleModule {}
