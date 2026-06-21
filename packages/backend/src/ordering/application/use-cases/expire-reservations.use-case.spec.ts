import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrderStatus } from '../../domain/order-status.enum';
import type { IExpiredOrderRepository } from '../../domain/ports/expired-order-repository.port';
import { ExpireReservationsUseCase } from './expire-reservations.use-case';
import type { TransitionOrderStatusUseCase } from './transition-order-status.use-case';

describe('ExpireReservationsUseCase', () => {
  let expiredOrderRepository: IExpiredOrderRepository;
  let transitionOrderStatusUseCase: Pick<TransitionOrderStatusUseCase, 'execute'>;
  let useCase: ExpireReservationsUseCase;
  const now = new Date('2026-06-16T10:30:00.000Z');

  beforeEach(() => {
    expiredOrderRepository = {
      findExpiredPendingOrderIds: vi.fn(),
    };
    transitionOrderStatusUseCase = {
      execute: vi.fn(),
    };
    useCase = new ExpireReservationsUseCase(
      expiredOrderRepository,
      transitionOrderStatusUseCase as TransitionOrderStatusUseCase,
    );
  });

  it('expires each stale pending order through the transition use case', async () => {
    vi.mocked(expiredOrderRepository.findExpiredPendingOrderIds).mockResolvedValue([
      'order-1',
      'order-2',
    ]);
    vi.mocked(transitionOrderStatusUseCase.execute).mockResolvedValue({} as never);

    const result = await useCase.execute({ now, limit: 50 });

    expect(expiredOrderRepository.findExpiredPendingOrderIds).toHaveBeenCalledWith(
      now,
      50,
    );
    expect(transitionOrderStatusUseCase.execute).toHaveBeenCalledTimes(2);
    expect(transitionOrderStatusUseCase.execute).toHaveBeenNthCalledWith(1, {
      orderId: 'order-1',
      status: OrderStatus.EXPIRED,
      skipOwnershipCheck: true,
      occurredAt: now,
    });
    expect(result).toEqual({ scanned: 2, expired: 2, failed: 0 });
  });

  it('continues scanning when one order was already transitioned concurrently', async () => {
    vi.mocked(expiredOrderRepository.findExpiredPendingOrderIds).mockResolvedValue([
      'order-1',
      'order-2',
    ]);
    vi.mocked(transitionOrderStatusUseCase.execute)
      .mockRejectedValueOnce(new Error('conflict'))
      .mockResolvedValueOnce({} as never);

    await expect(useCase.execute({ now })).resolves.toEqual({
      scanned: 2,
      expired: 1,
      failed: 1,
    });
  });
});
