import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Role } from '../../../identity/domain/role.enum';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { OrderNotFoundError } from '../../../ordering/domain/errors';
import { Payment } from '../../domain/payment.entity';
import { PaymentOrderNotPendingError } from '../../domain/errors';
import { PaymentSimulatorOutcome } from '../../domain/payment-simulator-outcome.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';
import { PaymentController } from './payment.controller';

function buildPayment(status = PaymentStatus.PENDING): Payment {
  return new Payment({
    id: 'payment-1',
    orderId: 'order-1',
    userId: 'user-1',
    provider: 'SIMULATOR',
    providerTransactionId: 'sim-payment-1',
    status,
    amountVnd: 2400000,
    redirectUrl: 'http://localhost:3000/payment-simulator/redirect?token=token',
    failureCode: null,
    failureMessage: null,
    createdAt: new Date('2026-06-19T10:01:00.000Z'),
    updatedAt: new Date('2026-06-19T10:01:00.000Z'),
    completedAt: null,
  });
}

describe('PaymentController', () => {
  let initiatePaymentUseCase: { execute: ReturnType<typeof vi.fn> };
  let callbackUseCase: { execute: ReturnType<typeof vi.fn> };
  let controller: PaymentController;

  beforeEach(() => {
    initiatePaymentUseCase = { execute: vi.fn() };
    callbackUseCase = { execute: vi.fn() };
    controller = new PaymentController(initiatePaymentUseCase as never, callbackUseCase as never);
  });

  it('uses auth and role guards on payment initiation', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      PaymentController.prototype.initiatePayment,
    );

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it('initiates payment for the authenticated user', async () => {
    initiatePaymentUseCase.execute.mockResolvedValue({
      payment: buildPayment(),
      redirectUrl: 'http://localhost:3000/payment-simulator/redirect?token=token',
      simulatorToken: 'token',
    });

    const result = await controller.initiatePayment(
      'order-1',
      {},
      { user: { id: 'user-1', roles: [Role.AUDIENCE] } },
    );

    expect(initiatePaymentUseCase.execute).toHaveBeenCalledWith({
      orderId: 'order-1',
      userId: 'user-1',
    });
    expect(result).toMatchObject({
      payment: { id: 'payment-1', status: PaymentStatus.PENDING },
      simulatorToken: 'token',
    });
  });

  it('maps missing order to 404', async () => {
    initiatePaymentUseCase.execute.mockRejectedValue(new OrderNotFoundError('order-1'));

    await expect(
      controller.initiatePayment('order-1', {}, { user: { id: 'user-1', roles: [Role.AUDIENCE] } }),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps non-pending order to 400', async () => {
    initiatePaymentUseCase.execute.mockRejectedValue(
      new PaymentOrderNotPendingError('order-1', 'PAID'),
    );

    await expect(
      controller.initiatePayment('order-1', {}, { user: { id: 'user-1', roles: [Role.AUDIENCE] } }),
    ).rejects.toThrow(BadRequestException);
  });

  it('processes simulator callback', async () => {
    callbackUseCase.execute.mockResolvedValue({
      payment: buildPayment(PaymentStatus.SUCCEEDED),
      outcome: PaymentSimulatorOutcome.SUCCESS,
      duplicate: false,
      orderTransitioned: true,
    });

    const result = await controller.simulatorCallback({
      token: 'token',
      outcome: PaymentSimulatorOutcome.SUCCESS,
    });

    expect(callbackUseCase.execute).toHaveBeenCalledWith({
      token: 'token',
      outcome: PaymentSimulatorOutcome.SUCCESS,
      providerEventId: undefined,
    });
    expect(result).toMatchObject({
      payment: { status: PaymentStatus.SUCCEEDED },
      orderTransitioned: true,
    });
  });
});
