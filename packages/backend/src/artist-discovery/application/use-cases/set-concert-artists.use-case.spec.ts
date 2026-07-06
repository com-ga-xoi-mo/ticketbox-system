import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import type { ArtistRepositoryPort } from '../../domain/ports/artist-repository.port';
import { ArtistNotFoundError } from '../../domain/errors';
import { SetConcertArtistsUseCase } from './set-concert-artists.use-case';

describe('SetConcertArtistsUseCase', () => {
  let authorize: AuthorizeConcertManagementUseCase;
  let repository: ArtistRepositoryPort;

  beforeEach(() => {
    authorize = {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthorizeConcertManagementUseCase;

    repository = {
      findById: vi.fn().mockResolvedValue({ id: 'artist-1', status: 'ACTIVE' }),
      setConcertArtists: vi.fn().mockResolvedValue(undefined),
    } as unknown as ArtistRepositoryPort;
  });

  function makeUseCase() {
    return new SetConcertArtistsUseCase(repository, authorize);
  }

  function makeCommand(overrides: Record<string, unknown> = {}) {
    return {
      concertId: 'concert-1',
      artists: [{ artistId: 'artist-1', displayOrder: 0 }],
      actor: { userId: 'user-1', roles: ['ORGANIZER'] },
      allowAdminOverride: false,
      ...overrides,
    };
  }

  it('authorizes ownership before replacing (organizer without admin override)', async () => {
    await makeUseCase().execute(makeCommand());

    expect(authorize.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        concertId: 'concert-1',
        allowAdminOverride: false,
        actor: expect.objectContaining({ userId: 'user-1' }),
      }),
    );
  });

  it('passes admin override through for the admin endpoint path', async () => {
    await makeUseCase().execute(
      makeCommand({ actor: { userId: 'admin-1', roles: ['ADMIN'] }, allowAdminOverride: true }),
    );

    expect(authorize.execute).toHaveBeenCalledWith(
      expect.objectContaining({ allowAdminOverride: true }),
    );
  });

  it('does not touch the repository when authorization fails', async () => {
    vi.mocked(authorize.execute).mockRejectedValue(new Error('forbidden'));

    await expect(makeUseCase().execute(makeCommand())).rejects.toThrow('forbidden');
    expect(repository.setConcertArtists).not.toHaveBeenCalled();
  });

  it('rejects an unknown artist without performing the replacement', async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);

    await expect(makeUseCase().execute(makeCommand())).rejects.toBeInstanceOf(ArtistNotFoundError);
    expect(repository.setConcertArtists).not.toHaveBeenCalled();
  });

  it('forwards the complete ordered replacement to a single repository operation', async () => {
    const artists = [
      { artistId: 'artist-1', displayOrder: 0 },
      { artistId: 'artist-2', displayOrder: 1 },
    ];
    vi.mocked(repository.findById).mockResolvedValue({ id: 'x', status: 'ACTIVE' } as never);

    await makeUseCase().execute(makeCommand({ artists }));

    expect(repository.setConcertArtists).toHaveBeenCalledTimes(1);
    expect(repository.setConcertArtists).toHaveBeenCalledWith({
      concertId: 'concert-1',
      artists,
    });
  });

  it('supports a valid empty replacement (clear all links)', async () => {
    await makeUseCase().execute(makeCommand({ artists: [] }));

    expect(repository.setConcertArtists).toHaveBeenCalledWith({
      concertId: 'concert-1',
      artists: [],
    });
  });
});
