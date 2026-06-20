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
import { ProcessSimulatorPaymentCallbackUseCase } from '../../application/use-cases/process-simulator-payment-callback.use-case';
import {
  InvalidPaymentSimulatorTokenError,
  PaymentCallbackMismatchError,
  PaymentNotFoundError,
  PaymentOrderNotPendingError,
  UnsupportedPaymentSimulatorOutcomeError,
} from '../../domain/errors';
import { PaymentSimulatorOutcome } from '../../domain/payment-simulator-outcome.enum';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { SimulatorCallbackDto } from './dto/simulator-callback.dto';
import {
  serializeInitiatedPayment,
  serializeSimulatorCallbackResult,
} from './payment-response.presenter';

@Controller()
export class PaymentController {
  constructor(
    private readonly initiatePaymentUseCase: InitiatePaymentUseCase,
    private readonly processSimulatorPaymentCallbackUseCase: ProcessSimulatorPaymentCallbackUseCase,
  ) {}

  @Post('orders/:id/payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDIENCE)
  async initiatePayment(
    @Param('id') orderId: string,
    @Body() _dto: InitiatePaymentDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    try {
      const result = await this.initiatePaymentUseCase.execute({
        orderId,
        userId: req.user.id,
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
      err instanceof InvalidPaymentSimulatorTokenError ||
      err instanceof PaymentCallbackMismatchError ||
      err instanceof UnsupportedPaymentSimulatorOutcomeError ||
      err instanceof PaymentOrderNotPendingError ||
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
