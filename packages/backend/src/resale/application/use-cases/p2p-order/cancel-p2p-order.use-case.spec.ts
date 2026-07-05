import { CancelP2POrderUseCase } from './cancel-p2p-order.use-case';
import { IResaleOrderRepository } from '../../../domain/ports/p2p-order/resale-order-repository.port';
import * as errors from '../../../domain/errors';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('CancelP2POrderUseCase', () => {
  let useCase: CancelP2POrderUseCase;
  let orderRepo: import('vitest').Mocked<IResaleOrderRepository>;

  beforeEach(() => {
    orderRepo = {
      findById: vi.fn(),
      cancelWithRefund: vi.fn(),
    } as unknown as import('vitest').Mocked<IResaleOrderRepository>;

    useCase = new CancelP2POrderUseCase(orderRepo);
  });

  it('throws OrderNotFoundError if order does not exist', async () => {
    orderRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute({ orderId: 'order-1', userId: 'user-1' }))
      .rejects.toThrow(errors.OrderNotFoundError);
  });

  it('throws NotOrderParticipantError if user is neither buyer nor seller', async () => {
    orderRepo.findById.mockResolvedValue({ buyerId: 'buyer-1', sellerId: 'seller-1' } as any);

    await expect(useCase.execute({ orderId: 'order-1', userId: 'user-1' }))
      .rejects.toThrow(errors.NotOrderParticipantError);
  });

  it('throws CannotCancelAfterPaymentConfirmedError if seller tries to cancel a paid order', async () => {
    orderRepo.findById.mockResolvedValue({ buyerId: 'buyer-1', sellerId: 'seller-1', status: 'PENDING_CONFIRM' } as any);

    await expect(useCase.execute({ orderId: 'order-1', userId: 'seller-1' }))
      .rejects.toThrow(errors.CannotCancelAfterPaymentConfirmedError);
  });

  it('cancels successfully if order is reserved', async () => {
    orderRepo.findById.mockResolvedValue({ id: 'order-1', buyerId: 'buyer-1', sellerId: 'seller-1', status: 'RESERVED' } as any);
    orderRepo.cancelWithRefund.mockResolvedValue({ id: 'order-1', status: 'CANCELLED' } as any);

    const result = await useCase.execute({ orderId: 'order-1', userId: 'buyer-1' });

    expect(result.status).toBe('CANCELLED');
    expect(orderRepo.cancelWithRefund).toHaveBeenCalledWith('order-1');
  });
});
