import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CacheServicePort } from '../../../platform/cache/cache.tokens';
import type { SetConcertArtistsUseCase } from '../use-cases/set-concert-artists.use-case';
import { InvalidatingSetConcertArtistsUseCase } from './invalidating-artist-write.use-cases';
import { ConcertCacheKeys } from '../../../concert-management/application/cache/concert-cache-keys';

describe('InvalidatingSetConcertArtistsUseCase', () => {
  let inner: SetConcertArtistsUseCase;
  let cache: CacheServicePort;

  const command = {
    concertId: 'concert-1',
    artists: [{ artistId: 'artist-1', displayOrder: 0 }],
    actor: { userId: 'user-1', roles: ['ORGANIZER'] },
    allowAdminOverride: false,
  };

  beforeEach(() => {
    inner = { execute: vi.fn().mockResolvedValue(undefined) } as unknown as SetConcertArtistsUseCase;
    cache = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      delByPrefix: vi.fn().mockResolvedValue(undefined),
    } as unknown as CacheServicePort;
  });

  it('invalidates the artist and public concert catalog namespaces only after the inner use case commits', async () => {
    await new InvalidatingSetConcertArtistsUseCase(inner, cache).execute(command);

    expect(inner.execute).toHaveBeenCalledWith(command);
    expect(cache.delByPrefix).toHaveBeenCalledWith('artist:');
    expect(cache.delByPrefix).toHaveBeenCalledWith(ConcertCacheKeys.NAMESPACE_PREFIX);
  });

  it('does not invalidate any cache when the replacement fails', async () => {
    vi.mocked(inner.execute).mockRejectedValue(new Error('rollback'));

    await expect(
      new InvalidatingSetConcertArtistsUseCase(inner, cache).execute(command),
    ).rejects.toThrow('rollback');
    expect(cache.delByPrefix).not.toHaveBeenCalled();
  });

  it('swallows cache deletion failures so the committed replacement still succeeds', async () => {
    vi.mocked(cache.delByPrefix).mockRejectedValue(new Error('redis down'));

    await expect(
      new InvalidatingSetConcertArtistsUseCase(inner, cache).execute(command),
    ).resolves.toBeUndefined();
  });
});
