import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';

import { PrismaArtistRepository } from './prisma-artist.repository';

/**
 * Transaction-level tests for setConcertArtists using a faked Prisma
 * transaction client. The $transaction fake runs the callback directly, so a
 * thrown error propagating out of execute() is the rollback signal.
 */
describe('PrismaArtistRepository.setConcertArtists', () => {
  const CONCERT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  let tx: {
    $queryRaw: ReturnType<typeof vi.fn>;
    concertArtist: {
      findMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
    };
    concert: { update: ReturnType<typeof vi.fn> };
  };
  let prisma: PrismaClient;
  let repository: PrismaArtistRepository;

  beforeEach(() => {
    tx = {
      $queryRaw: vi.fn(),
      concertArtist: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      concert: { update: vi.fn().mockResolvedValue({}) },
    };
    prisma = {
      $transaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => fn(tx)),
    } as unknown as PrismaClient;
    repository = new PrismaArtistRepository(prisma);
  });

  function lockConcert() {
    tx.$queryRaw.mockResolvedValueOnce([{ id: CONCERT_ID, artist_name: 'Legacy Name' }]);
  }

  function returnArtists(artists: { id: string; status: string; display_name: string }[]) {
    tx.$queryRaw.mockResolvedValueOnce(artists);
  }

  it('throws when the target concert does not exist (lock query returns nothing)', async () => {
    tx.$queryRaw.mockResolvedValueOnce([]);

    await expect(
      repository.setConcertArtists({ concertId: CONCERT_ID, artists: [] }),
    ).rejects.toThrow(/not found/);
    expect(tx.concertArtist.deleteMany).not.toHaveBeenCalled();
  });

  it('replaces links and synchronizes artistName from the displayOrder-0 primary artist', async () => {
    lockConcert();
    returnArtists([
      { id: 'artist-1', status: 'ACTIVE', display_name: 'Headliner' },
      { id: 'artist-2', status: 'ACTIVE', display_name: 'Support Act' },
    ]);

    await repository.setConcertArtists({
      concertId: CONCERT_ID,
      artists: [
        { artistId: 'artist-2', displayOrder: 1 },
        { artistId: 'artist-1', displayOrder: 0 },
      ],
    });

    expect(tx.concertArtist.deleteMany).toHaveBeenCalledWith({ where: { concertId: CONCERT_ID } });
    expect(tx.concertArtist.createMany).toHaveBeenCalledWith({
      data: [
        { concertId: CONCERT_ID, artistId: 'artist-2', displayOrder: 1 },
        { concertId: CONCERT_ID, artistId: 'artist-1', displayOrder: 0 },
      ],
    });
    expect(tx.concert.update).toHaveBeenCalledWith({
      where: { id: CONCERT_ID },
      data: { artistName: 'Headliner' },
    });
  });

  it('empty replacement clears all links but preserves the legacy artistName', async () => {
    lockConcert();
    tx.concertArtist.findMany.mockResolvedValue([
      { concertId: CONCERT_ID, artistId: 'artist-1', displayOrder: 0 },
    ]);

    await repository.setConcertArtists({ concertId: CONCERT_ID, artists: [] });

    expect(tx.concertArtist.deleteMany).toHaveBeenCalledWith({ where: { concertId: CONCERT_ID } });
    expect(tx.concertArtist.createMany).not.toHaveBeenCalled();
    expect(tx.concert.update).not.toHaveBeenCalled();
  });

  it('rejects the replacement when a submitted artist does not exist, without partial writes', async () => {
    lockConcert();
    returnArtists([{ id: 'artist-1', status: 'ACTIVE', display_name: 'Headliner' }]);

    await expect(
      repository.setConcertArtists({
        concertId: CONCERT_ID,
        artists: [
          { artistId: 'artist-1', displayOrder: 0 },
          { artistId: 'artist-ghost', displayOrder: 1 },
        ],
      }),
    ).rejects.toThrow(/do not exist/);
    expect(tx.concertArtist.deleteMany).not.toHaveBeenCalled();
    expect(tx.concertArtist.createMany).not.toHaveBeenCalled();
  });

  it('rejects linking an inactive artist that is not already linked', async () => {
    lockConcert();
    tx.concertArtist.findMany.mockResolvedValue([]);
    returnArtists([{ id: 'artist-inactive', status: 'INACTIVE', display_name: 'Retired' }]);

    await expect(
      repository.setConcertArtists({
        concertId: CONCERT_ID,
        artists: [{ artistId: 'artist-inactive', displayOrder: 0 }],
      }),
    ).rejects.toThrow(/inactive/i);
    expect(tx.concertArtist.deleteMany).not.toHaveBeenCalled();
  });

  it('retains an already-linked inactive artist in a resubmitted replacement', async () => {
    lockConcert();
    tx.concertArtist.findMany.mockResolvedValue([
      { concertId: CONCERT_ID, artistId: 'artist-inactive', displayOrder: 0 },
    ]);
    returnArtists([
      { id: 'artist-1', status: 'ACTIVE', display_name: 'Headliner' },
      { id: 'artist-inactive', status: 'INACTIVE', display_name: 'Retired' },
    ]);

    await repository.setConcertArtists({
      concertId: CONCERT_ID,
      artists: [
        { artistId: 'artist-1', displayOrder: 0 },
        { artistId: 'artist-inactive', displayOrder: 1 },
      ],
    });

    expect(tx.concertArtist.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ artistId: 'artist-inactive', displayOrder: 1 }),
      ]),
    });
    // primary is the ACTIVE artist at displayOrder 0
    expect(tx.concert.update).toHaveBeenCalledWith({
      where: { id: CONCERT_ID },
      data: { artistName: 'Headliner' },
    });
  });

  it('propagates a write failure out of the transaction so Prisma rolls it back', async () => {
    lockConcert();
    returnArtists([{ id: 'artist-1', status: 'ACTIVE', display_name: 'Headliner' }]);
    tx.concertArtist.createMany.mockRejectedValue(new Error('constraint violation'));

    await expect(
      repository.setConcertArtists({
        concertId: CONCERT_ID,
        artists: [{ artistId: 'artist-1', displayOrder: 0 }],
      }),
    ).rejects.toThrow('constraint violation');
  });
});
