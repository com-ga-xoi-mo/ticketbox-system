import { randomUUID } from 'crypto';

import { OrderStatus } from '../../../ordering/order.module';
import type { GetOrderUseCase } from '../../../ordering/order.module';
import type { Payment } from '../../domain/payment.entity';
import {
  PaymentGatewayRequestError,
  PaymentIdempotencyKeyMismatchError,
  PaymentInitiationInProgressError,
  PaymentInitiationPreviouslyFailedError,
  PaymentOrderNotPendingError,
} from '../../domain/errors';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';
import {
  PAYMENT_INITIATION_IDEMPOTENCY_TTL_SECONDS,
  type PaymentIdempotencyPort,
} from '../../domain/ports/payment-idempotency.port';
import type {
  PaymentGatewayPort,
  PaymentProviderMetadata,
} from '../../domain/ports/payment-gateway.port';
import type {
  PaymentCircuitBreakerPermit,
  PaymentCircuitBreakerPort,
} from '../../domain/ports/payment-circuit-breaker.port';
import type { PaymentRepositoryPort } from '../../domain/ports/payment-repository.port';
import { createPaymentInitiationRequestHash } from '../payment-initiation-fingerprint';

export interface InitiatePaymentCommand {
  orderId: string;
  userId: string;
  idempotencyKey: string;
  provider?: PaymentProvider;
}

export interface InitiatePaymentResult {
  payment: Payment;
  redirectUrl: string;
  simulatorToken?: string;
  providerMetadata?: PaymentProviderMetadata;
}

export class InitiatePaymentUseCase {
  constructor(
    private readonly getOrderUseCase: GetOrderUseCase,
    private readonly paymentRepository: PaymentRepositoryPort,
    private readonly paymentGateway: PaymentGatewayPort,
    private readonly paymentIdempotency: PaymentIdempotencyPort,
    private readonly paymentCircuitBreaker: PaymentCircuitBreakerPort,
  ) {}

  async execute(command: InitiatePaymentCommand): Promise<InitiatePaymentResult> {
    const provider = command.provider ?? PaymentProvider.SIMULATOR;
    const requestHash = createPaymentInitiationRequestHash({
      userId: command.userId,
      orderId: command.orderId,
      provider,
    });
    const idempotencyData = {
      userId: command.userId,
      orderId: command.orderId,
      provider,
      idempotencyKey: command.idempotencyKey,
      requestHash,
    };

    const claim = await this.paymentIdempotency.claimPaymentInitiation({
      ...idempotencyData,
      ttlSeconds: PAYMENT_INITIATION_IDEMPOTENCY_TTL_SECONDS,
    });

    if (claim.status === 'REPLAY') {
      return claim.response;
    }

    if (claim.status === 'MISMATCH') {
      throw new PaymentIdempotencyKeyMismatchError();
    }

    if (claim.status === 'FAILED') {
      throw new PaymentInitiationPreviouslyFailedError();
    }

    if (claim.status === 'IN_PROGRESS') {
      throw new PaymentInitiationInProgressError();
    }

    let providerCallStarted = false;
    let circuitPermit: PaymentCircuitBreakerPermit | null = null;

    try {
      const order = await this.getOrderUseCase.execute({
        orderId: command.orderId,
        userId: command.userId,
      });

      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new PaymentOrderNotPendingError(order.id, order.status);
      }

      const createdAt = new Date();
      const paymentId = randomUUID();
      circuitPermit = await this.paymentCircuitBreaker.acquireProviderCall({ provider });
      providerCallStarted = true;
      const session = await this.paymentGateway.createRedirectSession({
        provider,
        paymentId,
        orderId: order.id,
        userId: order.userId,
        amountVnd: order.totalAmountVnd,
      });
      await this.recordCircuitSuccess(circuitPermit);

      const payment = await this.paymentRepository.create({
        id: paymentId,
        orderId: order.id,
        userId: order.userId,
        provider: session.provider,
        providerTransactionId: session.providerTransactionId,
        status: PaymentStatus.PENDING,
        amountVnd: order.totalAmountVnd,
        redirectUrl: session.redirectUrl,
        createdAt,
      });

      const result = {
        payment,
        redirectUrl: session.redirectUrl,
        simulatorToken: session.simulatorToken,
        providerMetadata: session.providerMetadata,
      };

      await this.paymentIdempotency.completePaymentInitiation({
        ...idempotencyData,
        response: result,
        ttlSeconds: PAYMENT_INITIATION_IDEMPOTENCY_TTL_SECONDS,
      });

      return result;
    } catch (err: unknown) {
      if (circuitPermit && this.isProviderCircuitFailure(err)) {
        await this.recordCircuitFailure(circuitPermit);
      }

      if (providerCallStarted) {
        await this.paymentIdempotency.failPaymentInitiation({
          ...idempotencyData,
          ttlSeconds: PAYMENT_INITIATION_IDEMPOTENCY_TTL_SECONDS,
        });
      } else {
        await this.paymentIdempotency.releasePaymentInitiation(idempotencyData);
      }

      throw err;
    }
  }

  private isProviderCircuitFailure(err: unknown): boolean {
    if (err instanceof PaymentGatewayRequestError) {
      return true;
    }

    if (!(err instanceof Error)) {
      return false;
    }

    return err.name === 'AbortError' || err.name === 'TimeoutError' || /timeout/i.test(err.message);
  }

  private async recordCircuitSuccess(permit: PaymentCircuitBreakerPermit): Promise<void> {
    try {
      await this.paymentCircuitBreaker.recordProviderCallSuccess({
        provider: permit.provider,
        permit,
      });
    } catch {
      // Provider call already succeeded; do not turn circuit telemetry failure into payment failure.
    }
  }

  private async recordCircuitFailure(permit: PaymentCircuitBreakerPermit): Promise<void> {
    try {
      await this.paymentCircuitBreaker.recordProviderCallFailure({
        provider: permit.provider,
        permit,
      });
    } catch {
      // Preserve the original provider error so callers get the real payment failure.
    }
  }
}
