import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { Role } from '../../../identity/domain/role.enum';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import {
  InvalidOrderTransitionError,
  OrderAccessDeniedError,
  OrderNotFoundError,
} from '../../../ordering/domain/errors';
import { InitiatePaymentUseCase } from '../../application/use-cases/initiate-payment.use-case';
import { ProcessMomoIpnUseCase } from '../../application/use-cases/process-momo-ipn.use-case';
import { ProcessSimulatorPaymentCallbackUseCase } from '../../application/use-cases/process-simulator-payment-callback.use-case';
import {
  InvalidMomoIpnSignatureError,
  InvalidPaymentSimulatorTokenError,
  PaymentCallbackMismatchError,
  PaymentCircuitBreakerStoreUnavailableError,
  PaymentGatewayRequestError,
  PaymentIdempotencyKeyMismatchError,
  PaymentIdempotencyStoreUnavailableError,
  PaymentInitiationInProgressError,
  PaymentInitiationPreviouslyFailedError,
  PaymentNotFoundError,
  PaymentOrderNotPendingError,
  PaymentProviderCircuitOpenError,
  PaymentProviderHalfOpenTrialRejectedError,
  UnsupportedPaymentProviderError,
  UnsupportedPaymentSimulatorOutcomeError,
} from '../../domain/errors';
import { PaymentSimulatorOutcome } from '../../domain/payment-simulator-outcome.enum';
import type { MomoIpnPayload } from '../../domain/ports/payment-gateway.port';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { MomoIpnDto } from './dto/momo-ipn.dto';
import { SimulatorCallbackDto } from './dto/simulator-callback.dto';
import {
  serializeInitiatedPayment,
  serializeMomoIpnResult,
  serializeSimulatorCallbackResult,
} from './payment-response.presenter';

@Controller()
export class PaymentController {
  constructor(
    private readonly initiatePaymentUseCase: InitiatePaymentUseCase,
    private readonly processSimulatorPaymentCallbackUseCase: ProcessSimulatorPaymentCallbackUseCase,
    private readonly processMomoIpnUseCase: ProcessMomoIpnUseCase,
  ) {}

  @Post('orders/:id/payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDIENCE)
  async initiatePayment(
    @Param('id') orderId: string,
    @Body() dto: InitiatePaymentDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    try {
      const result = await this.initiatePaymentUseCase.execute({
        orderId,
        userId: req.user.id,
        idempotencyKey: dto.idempotencyKey,
        provider: dto.provider,
      });

      return serializeInitiatedPayment(result);
    } catch (err: unknown) {
      this.mapPaymentError(err);
    }
  }

  @Get('payment-simulator/redirect')
  async simulatorRedirect(@Query('token') token: string, @Query('outcome') outcome?: string) {
    if (!outcome) {
      return {
        token,
        outcomes: Object.values(PaymentSimulatorOutcome),
        callbackUrl: '/payments/simulator/callback',
      };
    }

    const result = await this.handleSimulatorOutcome(token, outcome);
    return serializeSimulatorCallbackResult(result);
  }

  @Post('payments/simulator/callback')
  async simulatorCallback(@Body() dto: SimulatorCallbackDto) {
    const result = await this.handleSimulatorOutcome(dto.token, dto.outcome, dto.providerEventId);

    return serializeSimulatorCallbackResult(result);
  }

  @Post('payments/momo/ipn')
  async momoIpn(@Body() dto: MomoIpnDto) {
    try {
      const payload: MomoIpnPayload = { ...dto };
      const result = await this.processMomoIpnUseCase.execute({ payload });

      return serializeMomoIpnResult(result);
    } catch (err: unknown) {
      this.mapPaymentError(err);
    }
  }

  private async handleSimulatorOutcome(token: string, outcome: string, providerEventId?: string) {
    try {
      if (outcome === PaymentSimulatorOutcome.DUPLICATE_SUCCESS) {
        await this.processSimulatorPaymentCallbackUseCase.execute({
          token,
          outcome: PaymentSimulatorOutcome.SUCCESS,
          providerEventId,
        });
      }

      return await this.processSimulatorPaymentCallbackUseCase.execute({
        token,
        outcome,
        providerEventId,
      });
    } catch (err: unknown) {
      this.mapPaymentError(err);
    }
  }

  private mapPaymentError(err: unknown): never {
    if (
      err instanceof PaymentIdempotencyKeyMismatchError ||
      err instanceof PaymentInitiationInProgressError ||
      err instanceof PaymentInitiationPreviouslyFailedError
    ) {
      throw new ConflictException(err.message);
    }
    if (err instanceof PaymentIdempotencyStoreUnavailableError) {
      throw new ServiceUnavailableException(err.message);
    }
    if (
      err instanceof PaymentProviderCircuitOpenError ||
      err instanceof PaymentProviderHalfOpenTrialRejectedError ||
      err instanceof PaymentCircuitBreakerStoreUnavailableError
    ) {
      throw new ServiceUnavailableException(err.message);
    }
    if (
      err instanceof InvalidPaymentSimulatorTokenError ||
      err instanceof PaymentCallbackMismatchError ||
      err instanceof UnsupportedPaymentSimulatorOutcomeError ||
      err instanceof UnsupportedPaymentProviderError ||
      err instanceof PaymentOrderNotPendingError ||
      err instanceof PaymentGatewayRequestError ||
      err instanceof InvalidMomoIpnSignatureError ||
      err instanceof InvalidOrderTransitionError
    ) {
      throw new BadRequestException(err.message);
    }
    if (
      err instanceof OrderNotFoundError ||
      err instanceof OrderAccessDeniedError ||
      err instanceof PaymentNotFoundError
    ) {
      throw new NotFoundException(err.message);
    }
    throw err;
  }
}
