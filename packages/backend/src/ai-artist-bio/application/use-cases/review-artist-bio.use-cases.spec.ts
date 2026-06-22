import { describe, expect, it, vi } from 'vitest';

import { Role } from '../../../identity/domain/role.enum';
import { ArtistBioStatus } from '../../domain/artist-bio.types';
import { ArtistBioStatusTransitionError } from '../../domain/errors';
import { InMemoryArtistBioQueue, InMemoryArtistBioRepository } from '../../testing/fakes';
import { PublishArtistBioUseCase } from './publish-artist-bio.use-case';
import { RejectArtistBioUseCase } from './reject-artist-bio.use-case';
import { RetryArtistBioJobUseCase } from './retry-artist-bio-job.use-case';

const actor = { userId: 'organizer-1', roles: [Role.ORGANIZER] };
const authorize = { execute: vi.fn(async () => undefined) };

describe('artist bio review and retry use cases', () => {
  it('publishes only ready-for-review bios and copies generated text into public text', async () => {
    const repository = new InMemoryArtistBioRepository();
    repository.records.set(
      'artist-bio-1',
      repository.record({
        id: 'artist-bio-1',
        status: ArtistBioStatus.READY_FOR_REVIEW,
        generatedBio: 'Approved biography',
      }),
    );
    const useCase = new PublishArtistBioUseCase(repository, authorize as never);

    const published = await useCase.execute({
      artistBioId: 'artist-bio-1',
      concertId: 'concert-1',
      actor,
      allowAdminOverride: false,
      publishedAt: new Date('2026-06-18T08:00:00.000Z'),
    });

    expect(published).toMatchObject({
      status: ArtistBioStatus.PUBLISHED,
      publishedBio: 'Approved biography',
      reviewedById: 'organizer-1',
    });
  });

  it('rejects invalid publish transitions', async () => {
    const repository = new InMemoryArtistBioRepository();
    repository.records.set('artist-bio-1', repository.record({ id: 'artist-bio-1' }));
    const useCase = new PublishArtistBioUseCase(repository, authorize as never);

    await expect(
      useCase.execute({
        artistBioId: 'artist-bio-1',
        concertId: 'concert-1',
        actor,
        allowAdminOverride: false,
      }),
    ).rejects.toBeInstanceOf(ArtistBioStatusTransitionError);
  });

  it('retries failed jobs by returning them to draft and enqueueing the transient job trigger', async () => {
    const repository = new InMemoryArtistBioRepository();
    const queue = new InMemoryArtistBioQueue();
    repository.records.set(
      'artist-bio-1',
      repository.record({
        id: 'artist-bio-1',
        status: ArtistBioStatus.FAILED,
        errorMessage: 'Provider unavailable',
      }),
    );
    const useCase = new RetryArtistBioJobUseCase(repository, queue, authorize as never);

    const retried = await useCase.execute({
      artistBioId: 'artist-bio-1',
      concertId: 'concert-1',
      actor,
      allowAdminOverride: false,
    });

    expect(retried).toMatchObject({
      status: ArtistBioStatus.DRAFT,
      errorMessage: null,
    });
    expect(queue.enqueued).toEqual(['artist-bio-1']);
  });

  it('rejects manual retry after retry attempts are exhausted', async () => {
    const repository = new InMemoryArtistBioRepository();
    const queue = new InMemoryArtistBioQueue();
    repository.records.set(
      'artist-bio-1',
      repository.record({
        id: 'artist-bio-1',
        status: ArtistBioStatus.FAILED,
        retryCount: 3,
        maxAttempts: 3,
      }),
    );
    const useCase = new RetryArtistBioJobUseCase(repository, queue, authorize as never);

    await expect(
      useCase.execute({
        artistBioId: 'artist-bio-1',
        concertId: 'concert-1',
        actor,
        allowAdminOverride: false,
      }),
    ).rejects.toThrow('Artist bio job has exhausted retry attempts.');
    expect(queue.enqueued).toEqual([]);
  });

  it('rejects manual retry before nextRetryAt has passed', async () => {
    const repository = new InMemoryArtistBioRepository();
    const queue = new InMemoryArtistBioQueue();
    repository.records.set(
      'artist-bio-1',
      repository.record({
        id: 'artist-bio-1',
        status: ArtistBioStatus.FAILED,
        retryCount: 1,
        maxAttempts: 3,
        nextRetryAt: new Date(Date.now() + 60_000),
      }),
    );
    const useCase = new RetryArtistBioJobUseCase(repository, queue, authorize as never);

    await expect(
      useCase.execute({
        artistBioId: 'artist-bio-1',
        concertId: 'concert-1',
        actor,
        allowAdminOverride: false,
      }),
    ).rejects.toThrow('Artist bio job is not ready to retry yet.');
    expect(queue.enqueued).toEqual([]);
  });

  it('reject keeps generated text non-public by moving the workflow back to draft', async () => {
    const repository = new InMemoryArtistBioRepository();
    repository.records.set(
      'artist-bio-1',
      repository.record({
        id: 'artist-bio-1',
        status: ArtistBioStatus.READY_FOR_REVIEW,
        generatedBio: 'Needs revision',
        publishedBio: null,
      }),
    );
    const useCase = new RejectArtistBioUseCase(repository, authorize as never);

    const rejected = await useCase.execute({
      artistBioId: 'artist-bio-1',
      concertId: 'concert-1',
      actor,
      allowAdminOverride: false,
    });

    expect(rejected).toMatchObject({
      status: ArtistBioStatus.DRAFT,
      generatedBio: 'Needs revision',
      publishedBio: null,
    });
  });
});
