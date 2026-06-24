import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import {
  GetOrderUseCase,
  OrderModule,
  TransitionOrderStatusUseCase,
} from '../ordering/order.module';
import { PlatformConfigModule } from '../platform/config/platform-config.module';
import { DatabaseModule } from '../platform/database/database.module';
import { RedisModule } from '../platform/redis/redis.module';
import { PaymentController } from './adapters/http/payment.controller';
import { InitiatePaymentUseCase } from './application/use-cases/initiate-payment.use-case';
import { ProcessMomoIpnUseCase } from './application/use-cases/process-momo-ipn.use-case';
import { ProcessSimulatorPaymentCallbackUseCase } from './application/use-cases/process-simulator-payment-callback.use-case';
import { ProcessVnpayIpnUseCase } from './application/use-cases/process-vnpay-ipn.use-case';
import { VerifyVnpayReturnUseCase } from './application/use-cases/verify-vnpay-return.use-case';
import {
  PAYMENT_CIRCUIT_BREAKER,
  type PaymentCircuitBreakerPort,
} from './domain/ports/payment-circuit-breaker.port';
import { PAYMENT_GATEWAY, type PaymentGatewayPort } from './domain/ports/payment-gateway.port';
import {
  PAYMENT_IDEMPOTENCY,
  type PaymentIdempotencyPort,
} from './domain/ports/payment-idempotency.port';
import {
  PAYMENT_REPOSITORY,
  type PaymentRepositoryPort,
} from './domain/ports/payment-repository.port';
import { PrismaPaymentRepository } from './infrastructure/database/prisma-payment.repository';
import { MomoPaymentGateway } from './infrastructure/momo/momo-payment-gateway';
import { PaymentGatewayRegistry } from './infrastructure/payment-gateway-registry';
import { RedisPaymentCircuitBreaker } from './infrastructure/redis/redis-payment-circuit-breaker';
import { RedisPaymentIdempotencyStore } from './infrastructure/redis/redis-payment-idempotency.store';
import { SimulatorPaymentGateway } from './infrastructure/simulator/simulator-payment-gateway';
import { VnpayPaymentGateway } from './infrastructure/vnpay/vnpay-payment-gateway';

@Module({
  imports: [PlatformConfigModule, DatabaseModule, RedisModule, AuthModule, OrderModule],
  controllers: [PaymentController],
  providers: [
    {
      provide: InitiatePaymentUseCase,
      inject: [
        GetOrderUseCase,
        PAYMENT_REPOSITORY,
        PAYMENT_GATEWAY,
        PAYMENT_IDEMPOTENCY,
        PAYMENT_CIRCUIT_BREAKER,
      ],
      useFactory: (
        getOrderUseCase: GetOrderUseCase,
        paymentRepository: PaymentRepositoryPort,
        paymentGateway: PaymentGatewayPort,
        paymentIdempotency: PaymentIdempotencyPort,
        paymentCircuitBreaker: PaymentCircuitBreakerPort,
      ) =>
        new InitiatePaymentUseCase(
          getOrderUseCase,
          paymentRepository,
          paymentGateway,
          paymentIdempotency,
          paymentCircuitBreaker,
        ),
    },
    {
      provide: ProcessSimulatorPaymentCallbackUseCase,
      inject: [PAYMENT_REPOSITORY, PAYMENT_GATEWAY, TransitionOrderStatusUseCase],
      useFactory: (
        paymentRepository: PaymentRepositoryPort,
        paymentGateway: PaymentGatewayPort,
        transitionOrderStatusUseCase: TransitionOrderStatusUseCase,
      ) =>
        new ProcessSimulatorPaymentCallbackUseCase(
          paymentRepository,
          paymentGateway,
          transitionOrderStatusUseCase,
        ),
    },
    {
      provide: ProcessMomoIpnUseCase,
      inject: [PAYMENT_REPOSITORY, PAYMENT_GATEWAY, TransitionOrderStatusUseCase],
      useFactory: (
        paymentRepository: PaymentRepositoryPort,
        paymentGateway: PaymentGatewayPort,
        transitionOrderStatusUseCase: TransitionOrderStatusUseCase,
      ) =>
        new ProcessMomoIpnUseCase(paymentRepository, paymentGateway, transitionOrderStatusUseCase),
    },
    {
      provide: ProcessVnpayIpnUseCase,
      inject: [PAYMENT_REPOSITORY, PAYMENT_GATEWAY, TransitionOrderStatusUseCase],
      useFactory: (
        paymentRepository: PaymentRepositoryPort,
        paymentGateway: PaymentGatewayPort,
        transitionOrderStatusUseCase: TransitionOrderStatusUseCase,
      ) =>
        new ProcessVnpayIpnUseCase(paymentRepository, paymentGateway, transitionOrderStatusUseCase),
    },
    {
      provide: VerifyVnpayReturnUseCase,
      inject: [PAYMENT_GATEWAY],
      useFactory: (paymentGateway: PaymentGatewayPort) =>
        new VerifyVnpayReturnUseCase(paymentGateway),
    },
    {
      provide: PAYMENT_REPOSITORY,
      useClass: PrismaPaymentRepository,
    },
    {
      provide: PAYMENT_IDEMPOTENCY,
      useClass: RedisPaymentIdempotencyStore,
    },
    {
      provide: PAYMENT_CIRCUIT_BREAKER,
      useClass: RedisPaymentCircuitBreaker,
    },
    SimulatorPaymentGateway,
    MomoPaymentGateway,
    VnpayPaymentGateway,
    {
      provide: PAYMENT_GATEWAY,
      useClass: PaymentGatewayRegistry,
    },
  ],
  exports: [
    InitiatePaymentUseCase,
    ProcessSimulatorPaymentCallbackUseCase,
    ProcessMomoIpnUseCase,
    ProcessVnpayIpnUseCase,
    VerifyVnpayReturnUseCase,
  ],
})
export class PaymentModule {}

export { InitiatePaymentUseCase } from './application/use-cases/initiate-payment.use-case';
export { ProcessMomoIpnUseCase } from './application/use-cases/process-momo-ipn.use-case';
export { ProcessSimulatorPaymentCallbackUseCase } from './application/use-cases/process-simulator-payment-callback.use-case';
export { ProcessVnpayIpnUseCase } from './application/use-cases/process-vnpay-ipn.use-case';
export { VerifyVnpayReturnUseCase } from './application/use-cases/verify-vnpay-return.use-case';
