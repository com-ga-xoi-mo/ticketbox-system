import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaResaleListingRepository } from './prisma-resale-listing.repository';

describe('PrismaResaleListingRepository.getFeed', () => {
  const queryRawUnsafe = vi.fn();
  const repository = new PrismaResaleListingRepository({
    $queryRawUnsafe: queryRawUnsafe,
  } as any);

  beforeEach(() => {
    vi.clearAllMocks();
    queryRawUnsafe.mockResolvedValue([]);
  });

  it('only returns active listings to anonymous users', async () => {
    await repository.getFeed({ sort: 'newest', page: 1, limit: 20 });

    const [query, ...params] = queryRawUnsafe.mock.calls[0];
    expect(query).toContain("WHERE l.status = 'ACTIVE'");
    expect(query).not.toContain('current_order');
    expect(params).toEqual([20, 0]);
  });

  it('also returns a reserved listing to the buyer who owns its active order', async () => {
    await repository.getFeed({
      sort: 'newest',
      page: 1,
      limit: 20,
      userId: '11111111-1111-4111-8111-111111111111',
    });

    const [query, ...params] = queryRawUnsafe.mock.calls[0];
    expect(query).toContain("l.status = 'RESERVED' AND current_order.id IS NOT NULL");
    expect(query).toContain('o.buyer_id = $1::uuid');
    expect(query).toContain("o.status IN ('RESERVED', 'PENDING_CONFIRM', 'IN_DISPUTE')");
    expect(query).toContain('current_order.id as "currentOrderId"');
    expect(params).toEqual(['11111111-1111-4111-8111-111111111111', 20, 0]);
  });
});
