import { describe, expect, it, vi } from 'vitest';

import { Role } from '../../../identity/domain/role.enum';
import { InvalidPressKitError } from '../../domain/errors';
import {
  InMemoryArtistBioQueue,
  InMemoryArtistBioRepository,
  InMemoryObjectStorage,
} from '../../testing/fakes';
import { RequestArtistBioUseCase } from './request-artist-bio.use-case';

const pdf = Buffer.from('%PDF-1.4\n1 0 obj\nBT Artist profile ET\nendobj\n%%EOF');
const actor = { userId: 'organizer-1', roles: [Role.ORGANIZER] };

function createUseCase(options: { maxBytes?: number; failStorage?: boolean } = {}) {
  const repository = new InMemoryArtistBioRepository();
  const storage = new InMemoryObjectStorage();
  storage.failPut = options.failStorage ?? false;
  const queue = new InMemoryArtistBioQueue();
  const authorize = {
    execute: vi.fn(async () => undefined),
  };
  const useCase = new RequestArtistBioUseCase(
    repository,
    storage,
    queue,
    authorize as never,
    options.maxBytes ?? 1024,
    3,
  );
  return { useCase, repository, storage, queue, authorize };
}

describe('RequestArtistBioUseCase', () => {
  it('authorizes organizer ownership, stores a valid PDF, creates workflow, and enqueues processing', async () => {
    const { useCase, repository, storage, queue, authorize } = createUseCase();

    const record = await useCase.execute({
      concertId: 'concert-1',
      actor,
      allowAdminOverride: false,
      upload: {
        originalName: 'artist-profile.pdf',
        contentType: 'application/pdf',
        content: pdf,
      },
    });

    expect(authorize.execute).toHaveBeenCalledWith({
      concertId: 'concert-1',
      actor,
      allowAdminOverride: false,
    });
    expect(repository.assets.size).toBe(1);
    expect(storage.objects.size).toBe(1);
    expect(record).toMatchObject({
      concertId: 'concert-1',
      pressKitAssetId: 'asset-1',
      requestedById: 'organizer-1',
      retryCount: 0,
      maxAttempts: 3,
    });
    expect(queue.enqueued).toEqual([record.id]);
  });

  it('rejects a non-PDF upload before storage or job creation', async () => {
    const { useCase, repository, storage, queue } = createUseCase();

    await expect(
      useCase.execute({
        concertId: 'concert-1',
        actor,
        allowAdminOverride: false,
        upload: {
          originalName: 'artist-profile.txt',
          contentType: 'text/plain',
          content: Buffer.from('not a pdf'),
        },
      }),
    ).rejects.toBeInstanceOf(InvalidPressKitError);

    expect(repository.records.size).toBe(0);
    expect(storage.objects.size).toBe(0);
    expect(queue.enqueued).toEqual([]);
  });

  it('rejects oversized PDFs before storage or job creation', async () => {
    const { useCase, repository, storage } = createUseCase({ maxBytes: 8 });

    await expect(
      useCase.execute({
        concertId: 'concert-1',
        actor,
        allowAdminOverride: false,
        upload: {
          originalName: 'artist-profile.pdf',
          contentType: 'application/pdf',
          content: pdf,
        },
      }),
    ).rejects.toBeInstanceOf(InvalidPressKitError);

    expect(repository.records.size).toBe(0);
    expect(storage.objects.size).toBe(0);
  });

  it('does not create artist_bios workflow records when object storage fails', async () => {
    const { useCase, repository, queue } = createUseCase({ failStorage: true });

    await expect(
      useCase.execute({
        concertId: 'concert-1',
        actor,
        allowAdminOverride: false,
        upload: {
          originalName: 'artist-profile.pdf',
          contentType: 'application/pdf',
          content: pdf,
        },
      }),
    ).rejects.toThrow('Object storage unavailable');

    expect(repository.assets.size).toBe(0);
    expect(repository.records.size).toBe(0);
    expect(queue.enqueued).toEqual([]);
  });
});
