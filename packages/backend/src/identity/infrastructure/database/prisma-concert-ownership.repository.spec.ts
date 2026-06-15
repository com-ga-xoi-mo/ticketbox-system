import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaConcertOwnershipRepository } from './prisma-concert-ownership.repository';

describe('PrismaConcertOwnershipRepository', () => {
  let prisma: {
    concert: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  let repository: PrismaConcertOwnershipRepository;

  beforeEach(() => {
    prisma = {
      concert: {
        findUnique: vi.fn(),
      },
    };
    repository = new PrismaConcertOwnershipRepository(prisma as never);
  });

  it('returns concert owner projection', async () => {
    prisma.concert.findUnique.mockResolvedValue({
      id: 'concert-1',
      createdById: 'organizer-1',
    });

    await expect(repository.findOwnership('concert-1')).resolves.toEqual({
      concertId: 'concert-1',
      ownerUserId: 'organizer-1',
    });
  });

  it('returns null when concert does not exist', async () => {
    prisma.concert.findUnique.mockResolvedValue(null);

    await expect(repository.findOwnership('missing')).resolves.toBeNull();
  });
});
