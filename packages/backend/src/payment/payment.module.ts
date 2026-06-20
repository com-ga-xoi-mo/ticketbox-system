import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import {
  GetOrderUseCase,
  OrderModule,
  TransitionOrderStatusUseCase,
} from '../ordering/order.module';
import { PlatformConfigModule } from '../platform/config/platform-config.module';
import { DatabaseModule } from '../platform/database/database.module';
import { PaymentController } from './adapters/http/payment.controller';
import { InitiatePaymentUseCase } from './application/use-cases/initiate-payment.use-case';
import { ProcessSimulatorPaymentCallbackUseCase } from './application/use-cases/process-simulator-payment-callback.use-case';
import { PAYMENT_GATEWAY, type PaymentGatewayPort } from './domain/ports/payment-gateway.port';
import {
  PAYMENT_REPOSITORY,
  type PaymentRepositoryPort,
} from './domain/ports/payment-repository.port';
import { PrismaPaymentRepository } from './infrastructure/database/prisma-payment.repository';
import { SimulatorPaymentGateway } from './infrastructure/simulator/simulator-payment-gateway';

@Module({
  imports: [PlatformConfigModule, DatabaseModule, AuthModule, OrderModule],
  controllers: [PaymentController],
  providers: [
    {
      provide: InitiatePaymentUseCase,
      inject: [GetOrderUseCase, PAYMENT_REPOSITORY, PAYMENT_GATEWAY],
      useFactory: (
        getOrderUseCase: GetOrderUseCase,
        paymentRepository: PaymentRepositoryPort,
        paymentGateway: PaymentGatewayPort,
      ) => new InitiatePaymentUseCase(getOrderUseCase, paymentRepository, paymentGateway),
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
      provide: PAYMENT_REPOSITORY,
      useClass: PrismaPaymentRepository,
    },
    {
      provide: PAYMENT_GATEWAY,
      useClass: SimulatorPaymentGateway,
    },
  ],
  exports: [InitiatePaymentUseCase, ProcessSimulatorPaymentCallbackUseCase],
})
export class PaymentModule {}

export { InitiatePaymentUseCase } from './application/use-cases/initiate-payment.use-case';
export { ProcessSimulatorPaymentCallbackUseCase } from './application/use-cases/process-simulator-payment-callback.use-case';
