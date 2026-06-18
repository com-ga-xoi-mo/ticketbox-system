import { describe, expect, it, vi } from 'vitest';

import type { ExpireReservationsUseCase } from '../../application/use-cases/expire-reservations.use-case';
import { ExpiredReservationProcessor } from './expired-reservation.processor';
import { EXPIRE_RESERVATIONS_JOB } from './order-expiration-queue.constants';

describe('ExpiredReservationProcessor', () => {
  it('schedules a repeatable expiration scan on module init', async () => {
    const queue = { add: vi.fn() };
    const useCase = { execute: vi.fn() };
    const processor = new ExpiredReservationProcessor(
      useCase as unknown as ExpireReservationsUseCase,
      queue as never,
    );

    await processor.onModuleInit();

    expect(queue.add).toHaveBeenCalledWith(
      EXPIRE_RESERVATIONS_JOB,
      {},
      {
        jobId: EXPIRE_RESERVATIONS_JOB,
        repeat: { every: 60_000 },
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );
  });

  it('runs the expiration use case when processing a job', async () => {
    const result = { scanned: 2, expired: 1, failed: 1 };
    const queue = { add: vi.fn() };
    const useCase = { execute: vi.fn().mockResolvedValue(result) };
    const processor = new ExpiredReservationProcessor(
      useCase as unknown as ExpireReservationsUseCase,
      queue as never,
    );

    await expect(processor.process({ id: 'job-1' } as never)).resolves.toEqual(
      result,
    );
    expect(useCase.execute).toHaveBeenCalledWith();
  });
});
