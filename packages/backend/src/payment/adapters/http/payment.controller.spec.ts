import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Role } from '../../../identity/domain/role.enum';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { OrderNotFoundError } from '../../../ordering/domain/errors';
import { Payment } from '../../domain/payment.entity';
import {
  PaymentIdempotencyKeyMismatchError,
  PaymentInitiationInProgressError,
  PaymentOrderNotPendingError,
} from '../../domain/errors';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { PaymentSimulatorOutcome } from '../../domain/payment-simulator-outcome.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';
import { PaymentController } from './payment.controller';

function buildPayment(status = PaymentStatus.PENDING): Payment {
  return new Payment({
    id: 'payment-1',
    orderId: 'order-1',
    userId: 'user-1',
    provider: PaymentProvider.SIMULATOR,
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
  let momoIpnUseCase: { execute: ReturnType<typeof vi.fn> };
  let controller: PaymentController;

  beforeEach(() => {
    initiatePaymentUseCase = { execute: vi.fn() };
    callbackUseCase = { execute: vi.fn() };
    momoIpnUseCase = { execute: vi.fn() };
    controller = new PaymentController(
      initiatePaymentUseCase as never,
      callbackUseCase as never,
      momoIpnUseCase as never,
    );
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
      { provider: PaymentProvider.MOMO, idempotencyKey: 'pay-key-1' },
      { user: { id: 'user-1', roles: [Role.AUDIENCE] } },
    );

    expect(initiatePaymentUseCase.execute).toHaveBeenCalledWith({
      orderId: 'order-1',
      userId: 'user-1',
      idempotencyKey: 'pay-key-1',
      provider: PaymentProvider.MOMO,
    });
    expect(result).toMatchObject({
      payment: { id: 'payment-1', status: PaymentStatus.PENDING },
      simulatorToken: 'token',
    });
  });

  it('maps missing order to 404', async () => {
    initiatePaymentUseCase.execute.mockRejectedValue(new OrderNotFoundError('order-1'));

    await expect(
      controller.initiatePayment(
        'order-1',
        { idempotencyKey: 'pay-key-1' },
        { user: { id: 'user-1', roles: [Role.AUDIENCE] } },
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps non-pending order to 400', async () => {
    initiatePaymentUseCase.execute.mockRejectedValue(
      new PaymentOrderNotPendingError('order-1', 'PAID'),
    );

    await expect(
      controller.initiatePayment(
        'order-1',
        { idempotencyKey: 'pay-key-1' },
        { user: { id: 'user-1', roles: [Role.AUDIENCE] } },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('maps payment idempotency conflicts to 409', async () => {
    initiatePaymentUseCase.execute.mockRejectedValue(new PaymentIdempotencyKeyMismatchError());

    await expect(
      controller.initiatePayment(
        'order-1',
        { idempotencyKey: 'pay-key-1' },
        { user: { id: 'user-1', roles: [Role.AUDIENCE] } },
      ),
    ).rejects.toThrow(ConflictException);

    initiatePaymentUseCase.execute.mockRejectedValue(new PaymentInitiationInProgressError());

    await expect(
      controller.initiatePayment(
        'order-1',
        { idempotencyKey: 'pay-key-1' },
        { user: { id: 'user-1', roles: [Role.AUDIENCE] } },
      ),
    ).rejects.toThrow(ConflictException);
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

  it('processes MoMo IPN callbacks', async () => {
    const payment = buildPayment(PaymentStatus.SUCCEEDED);
    momoIpnUseCase.execute.mockResolvedValue({
      payment,
      momo: {
        partnerCode: 'MOMOUDLU20220629',
        orderId: 'payment-1',
        requestId: 'payment-1',
        amount: 2400000,
        resultCode: 0,
        message: 'Successful.',
        responseTime: 1780000000000,
        signature: 'signature',
        providerTransactionId: 'payment-1',
        providerEventId: 'momo:payment-1:payment-1:123:0',
        success: true,
        failureCode: null,
        failureMessage: null,
      },
      duplicate: false,
      orderTransitioned: true,
    });

    const result = await controller.momoIpn({
      partnerCode: 'MOMOUDLU20220629',
      orderId: 'payment-1',
      requestId: 'payment-1',
      amount: 2400000,
      resultCode: 0,
      message: 'Successful.',
      responseTime: 1780000000000,
      signature: 'signature',
    });

    expect(momoIpnUseCase.execute).toHaveBeenCalledWith({
      payload: expect.objectContaining({ orderId: 'payment-1', resultCode: 0 }),
    });
    expect(result).toMatchObject({
      orderId: 'payment-1',
      resultCode: 0,
      duplicate: false,
      orderTransitioned: true,
    });
  });
});
