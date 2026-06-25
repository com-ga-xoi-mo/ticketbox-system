import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { PromotionModule } from '../promotion/promotion.module';
import { EnqueuePurchaseConfirmationUseCase } from '../notification/application/use-cases/enqueue-purchase-confirmation.use-case';
import { PlatformConfigModule } from '../platform/config/platform-config.module';
import { PlatformConfigService } from '../platform/config/platform-config.service';
import { DatabaseModule } from '../platform/database/database.module';
import { InternalOrderController } from './adapters/http/internal-order.controller';
import { OrderController } from './adapters/http/order.controller';
import { InternalApiKeyGuard } from './adapters/http/guards/internal-api-key.guard';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { GetUserTicketUseCase } from './application/use-cases/get-user-ticket.use-case';
import { GetOrderUseCase } from './application/use-cases/get-order.use-case';
import { IssueTicketsForPaidOrderUseCase } from './application/use-cases/issue-tickets-for-paid-order.use-case';
import { ListUserTicketsUseCase } from './application/use-cases/list-user-tickets.use-case';
import { ListUserOrdersUseCase } from './application/use-cases/list-user-orders.use-case';
import { TransitionOrderStatusUseCase } from './application/use-cases/transition-order-status.use-case';
import {
  ORDER_EVENT_PUBLISHER,
  type IOrderEventPublisher,
} from './domain/ports/order-event-publisher.port';
import {
  INVENTORY_ADJUSTMENT_REPOSITORY,
  type IInventoryAdjustmentRepository,
} from './domain/ports/inventory-adjustment.port';
import {
  INVENTORY_RESERVATION_REPOSITORY,
  type IInventoryReservationRepository,
} from './domain/ports/inventory-reservation.port';
import {
  ORDER_PAID_NOTIFIER,
  type OrderPaidNotifierPort,
} from './domain/ports/order-paid-notifier.port';
import {
  ORDER_REPOSITORY,
  type IOrderRepository,
} from './domain/ports/order-repository.port';
import {
  TICKET_REPOSITORY,
  type TicketRepositoryPort,
} from './domain/ports/ticket-repository.port';
import {
  TICKET_TYPE_PRICING_REPOSITORY,
  type TicketTypePricingRepositoryPort,
} from './domain/ports/ticket-type-pricing.port';
import { QrTicketTokenService } from './domain/qr-ticket-token.service';
import { PrismaInventoryReservationRepository } from './infrastructure/database/prisma-inventory-reservation.repository';
import { PrismaOrderRepository } from './infrastructure/database/prisma-order.repository';
import { PrismaTicketRepository } from './infrastructure/database/prisma-ticket.repository';
import { PrismaTicketTypePricingRepository } from './infrastructure/database/prisma-ticket-type-pricing.repository';
import { TicketIssuingOrderEventPublisher } from './infrastructure/events/ticket-issuing-order-event-publisher';

@Module({
  imports: [PlatformConfigModule, DatabaseModule, AuthModule, NotificationModule, PromotionModule],
  controllers: [OrderController, InternalOrderController],
  providers: [
    {
      provide: CreateOrderUseCase,
      inject: [
        ORDER_REPOSITORY,
        INVENTORY_RESERVATION_REPOSITORY,
        TICKET_TYPE_PRICING_REPOSITORY,
        'PromotionValidationPort',
        PlatformConfigService,
      ],
      useFactory: (
        orderRepository: IOrderRepository,
        inventoryReservationRepository: IInventoryReservationRepository,
        ticketTypePricingRepository: TicketTypePricingRepositoryPort,
        promotionValidationPort: any,
        config: PlatformConfigService,
      ) =>
        new CreateOrderUseCase(
          orderRepository,
          inventoryReservationRepository,
          ticketTypePricingRepository,
          promotionValidationPort,
          {
            serviceFeeVnd: config.serviceFeeVnd,
            reservationTtlMinutes: config.orderReservationTtlMinutes,
          },
        ),
    },
    {
      provide: GetOrderUseCase,
      inject: [ORDER_REPOSITORY],
      useFactory: (orderRepository: IOrderRepository) =>
        new GetOrderUseCase(orderRepository),
    },
    {
      provide: ListUserOrdersUseCase,
      inject: [ORDER_REPOSITORY],
      useFactory: (orderRepository: IOrderRepository) =>
        new ListUserOrdersUseCase(orderRepository),
    },
    {
      provide: QrTicketTokenService,
      inject: [PlatformConfigService],
      useFactory: (config: PlatformConfigService) =>
        new QrTicketTokenService(config.qrTokenSecret),
    },
    {
      provide: IssueTicketsForPaidOrderUseCase,
      inject: [TICKET_REPOSITORY, QrTicketTokenService],
      useFactory: (
        ticketRepository: TicketRepositoryPort,
        qrTicketTokenService: QrTicketTokenService,
      ) =>
        new IssueTicketsForPaidOrderUseCase(
          ticketRepository,
          qrTicketTokenService,
        ),
    },
    {
      provide: ListUserTicketsUseCase,
      inject: [TICKET_REPOSITORY],
      useFactory: (ticketRepository: TicketRepositoryPort) =>
        new ListUserTicketsUseCase(ticketRepository),
    },
    {
      provide: GetUserTicketUseCase,
      inject: [TICKET_REPOSITORY, QrTicketTokenService],
      useFactory: (
        ticketRepository: TicketRepositoryPort,
        qrTicketTokenService: QrTicketTokenService,
      ) => new GetUserTicketUseCase(ticketRepository, qrTicketTokenService),
    },
    {
      provide: TransitionOrderStatusUseCase,
      inject: [ORDER_REPOSITORY, ORDER_EVENT_PUBLISHER, INVENTORY_ADJUSTMENT_REPOSITORY],
      useFactory: (
        orderRepository: IOrderRepository,
        orderEventPublisher: IOrderEventPublisher,
        inventoryAdjustmentRepository: IInventoryAdjustmentRepository,
      ) =>
        new TransitionOrderStatusUseCase(
          orderRepository,
          orderEventPublisher,
          inventoryAdjustmentRepository,
        ),
    },
    {
      provide: ORDER_REPOSITORY,
      useClass: PrismaOrderRepository,
    },
    {
      provide: ORDER_PAID_NOTIFIER,
      inject: [EnqueuePurchaseConfirmationUseCase],
      useFactory: (
        enqueuePurchaseConfirmation: EnqueuePurchaseConfirmationUseCase,
      ): OrderPaidNotifierPort => ({
        notifyOrderPaid: (orderId, paidAt) =>
          enqueuePurchaseConfirmation.execute(orderId, paidAt),
      }),
    },
    {
      provide: ORDER_EVENT_PUBLISHER,
      inject: [IssueTicketsForPaidOrderUseCase, ORDER_PAID_NOTIFIER, 'PromotionUsageRollbackPort'],
      useFactory: (
        issueTickets: IssueTicketsForPaidOrderUseCase,
        orderPaidNotifier: OrderPaidNotifierPort,
        promotionUsageRollbackPort: any,
      ) => new TicketIssuingOrderEventPublisher(issueTickets, orderPaidNotifier, promotionUsageRollbackPort),
    },
    {
      provide: TICKET_REPOSITORY,
      useClass: PrismaTicketRepository,
    },
    {
      provide: TICKET_TYPE_PRICING_REPOSITORY,
      useClass: PrismaTicketTypePricingRepository,
    },
    PrismaInventoryReservationRepository,
    {
      provide: INVENTORY_RESERVATION_REPOSITORY,
      useExisting: PrismaInventoryReservationRepository,
    },
    {
      provide: INVENTORY_ADJUSTMENT_REPOSITORY,
      useExisting: PrismaInventoryReservationRepository,
    },
    InternalApiKeyGuard,
  ],
  exports: [
    CreateOrderUseCase,
    GetOrderUseCase,
    ListUserOrdersUseCase,
    ListUserTicketsUseCase,
    GetUserTicketUseCase,
    IssueTicketsForPaidOrderUseCase,
    TransitionOrderStatusUseCase,
  ],
})
export class OrderModule {}

export { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
export { GetUserTicketUseCase } from './application/use-cases/get-user-ticket.use-case';
export { GetOrderUseCase } from './application/use-cases/get-order.use-case';
export { IssueTicketsForPaidOrderUseCase } from './application/use-cases/issue-tickets-for-paid-order.use-case';
export { ListUserTicketsUseCase } from './application/use-cases/list-user-tickets.use-case';
export { ListUserOrdersUseCase } from './application/use-cases/list-user-orders.use-case';
export { TransitionOrderStatusUseCase } from './application/use-cases/transition-order-status.use-case';
export { Order } from './domain/order.entity';
export type { OrderDomainEvent } from './domain/order-events';
export { OrderStatus } from './domain/order-status.enum';
export { Ticket } from './domain/ticket.entity';
export { TicketStatus } from './domain/ticket-status.enum';
