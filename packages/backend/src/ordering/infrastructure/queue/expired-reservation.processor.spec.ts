import { describe, expect, it, vi } from 'vitest';

import type { ExpireReservationsUseCase } from '../../application/use-cases/expire-reservations.use-case';
import { ExpiredReservationProcessor } from './expired-reservation.processor';
import { EXPIRE_RESERVATIONS_JOB } from './order-expiration-queue.constants';

describe('ExpiredReservationProcessor', () => {
  it('schedules a repeatable expiration scan on module init', async () => {
    const queue = { add: vi.fn() };
    const useCase = { execute: vi.fn() };
    const waitlistReleasePublisher = { publishPrimarySaleRelease: vi.fn() };
    const processor = new ExpiredReservationProcessor(
      useCase as unknown as ExpireReservationsUseCase,
      waitlistReleasePublisher,
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
    const result = {
      scanned: 2,
      expired: 1,
      skippedPaid: 0,
      conflicted: 0,
      failed: 1,
      releasedItems: [],
    };
    const queue = { add: vi.fn() };
    const useCase = { execute: vi.fn().mockResolvedValue(result) };
    const waitlistReleasePublisher = { publishPrimarySaleRelease: vi.fn() };
    const processor = new ExpiredReservationProcessor(
      useCase as unknown as ExpireReservationsUseCase,
      waitlistReleasePublisher,
      queue as never,
    );

    await expect(processor.process({ id: 'job-1' } as never)).resolves.toEqual(
      result,
    );
    expect(useCase.execute).toHaveBeenCalledWith();
    expect(waitlistReleasePublisher.publishPrimarySaleRelease).not.toHaveBeenCalled();
  });

  it('publishes released direct-sale ticket items to waitlist processing', async () => {
    const result = {
      scanned: 1,
      expired: 1,
      skippedPaid: 0,
      conflicted: 0,
      failed: 0,
      releasedItems: [{ ticketTypeId: 'ticket-type-1', quantityReleased: 2 }],
    };
    const queue = { add: vi.fn() };
    const useCase = { execute: vi.fn().mockResolvedValue(result) };
    const waitlistReleasePublisher = { publishPrimarySaleRelease: vi.fn() };
    const processor = new ExpiredReservationProcessor(
      useCase as unknown as ExpireReservationsUseCase,
      waitlistReleasePublisher,
      queue as never,
    );

    await expect(processor.process({ id: 'job-1' } as never)).resolves.toEqual(
      result,
    );
    expect(waitlistReleasePublisher.publishPrimarySaleRelease).toHaveBeenCalledWith(
      result.releasedItems,
    );
  });
});
