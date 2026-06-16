import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { PlatformConfigModule } from '../platform/config/platform-config.module';
import { PlatformConfigService } from '../platform/config/platform-config.service';
import { DatabaseModule } from '../platform/database/database.module';
import { InternalOrderController } from './adapters/http/internal-order.controller';
import { OrderController } from './adapters/http/order.controller';
import { InternalApiKeyGuard } from './adapters/http/guards/internal-api-key.guard';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { GetOrderUseCase } from './application/use-cases/get-order.use-case';
import { ListUserOrdersUseCase } from './application/use-cases/list-user-orders.use-case';
import { TransitionOrderStatusUseCase } from './application/use-cases/transition-order-status.use-case';
import {
  ORDER_EVENT_PUBLISHER,
  type IOrderEventPublisher,
} from './domain/ports/order-event-publisher.port';
import {
  ORDER_REPOSITORY,
  type IOrderRepository,
} from './domain/ports/order-repository.port';
import {
  TICKET_TYPE_PRICING_REPOSITORY,
  type TicketTypePricingRepositoryPort,
} from './domain/ports/ticket-type-pricing.port';
import { PrismaOrderRepository } from './infrastructure/database/prisma-order.repository';
import { PrismaTicketTypePricingRepository } from './infrastructure/database/prisma-ticket-type-pricing.repository';
import { NoopOrderEventPublisher } from './infrastructure/events/noop-order-event-publisher';

@Module({
  imports: [PlatformConfigModule, DatabaseModule, AuthModule],
  controllers: [OrderController, InternalOrderController],
  providers: [
    {
      provide: CreateOrderUseCase,
      inject: [ORDER_REPOSITORY, TICKET_TYPE_PRICING_REPOSITORY, PlatformConfigService],
      useFactory: (
        orderRepository: IOrderRepository,
        ticketTypePricingRepository: TicketTypePricingRepositoryPort,
        config: PlatformConfigService,
      ) =>
        new CreateOrderUseCase(orderRepository, ticketTypePricingRepository, {
          reservationTtlMinutes: config.orderReservationTtlMinutes,
        }),
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
      provide: TransitionOrderStatusUseCase,
      inject: [ORDER_REPOSITORY, ORDER_EVENT_PUBLISHER],
      useFactory: (
        orderRepository: IOrderRepository,
        orderEventPublisher: IOrderEventPublisher,
      ) => new TransitionOrderStatusUseCase(orderRepository, orderEventPublisher),
    },
    {
      provide: ORDER_REPOSITORY,
      useClass: PrismaOrderRepository,
    },
    {
      provide: ORDER_EVENT_PUBLISHER,
      useClass: NoopOrderEventPublisher,
    },
    {
      provide: TICKET_TYPE_PRICING_REPOSITORY,
      useClass: PrismaTicketTypePricingRepository,
    },
    InternalApiKeyGuard,
  ],
  exports: [
    CreateOrderUseCase,
    GetOrderUseCase,
    ListUserOrdersUseCase,
    TransitionOrderStatusUseCase,
  ],
})
export class OrderModule {}

export { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
export { GetOrderUseCase } from './application/use-cases/get-order.use-case';
export { ListUserOrdersUseCase } from './application/use-cases/list-user-orders.use-case';
export { TransitionOrderStatusUseCase } from './application/use-cases/transition-order-status.use-case';
export { Order } from './domain/order.entity';
export type { OrderDomainEvent } from './domain/order-events';
export { OrderStatus } from './domain/order-status.enum';
