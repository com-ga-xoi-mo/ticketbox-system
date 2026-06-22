import { GuestListEntryStatus, GuestListRowDisposition } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaGuestListRepository } from './prisma-guest-list.repository';

describe('PrismaGuestListRepository lookup and ordering queries', () => {
  it('filters VIP lookup to ACTIVE, concert, and one normalized identifier', async () => {
    const prisma = { guestListEntry: { findFirst: vi.fn().mockResolvedValue(null) } };
    await new PrismaGuestListRepository(prisma as never).findActiveGuest({
      concertId: 'concert',
      normalizedEmail: 'vip@x.test',
    });
    expect(prisma.guestListEntry.findFirst).toHaveBeenCalledWith({
      where: {
        concertId: 'concert',
        status: GuestListEntryStatus.ACTIVE,
        OR: [{ normalizedEmail: 'vip@x.test' }],
      },
    });
  });
  it('blocks a later sequence while an earlier same-concert batch is non-terminal', async () => {
    const prisma = { guestListBatch: { count: vi.fn().mockResolvedValue(1) } };
    await expect(
      new PrismaGuestListRepository(prisma as never).hasEarlierNonTerminal({
        id: 'b2',
        concertId: 'concert',
        sourceName: 'x',
        importSequence: 2,
        status: 'PENDING',
        processingAttempt: 0,
        createdAt: new Date(),
      } as never),
    ).resolves.toBe(true);
    expect(prisma.guestListBatch.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ concertId: 'concert', importSequence: { lt: 2 } }),
      }),
    );
  });
  it('returns immutable evidence before attempting another projection mutation', async () => {
    const evidence = {
      batchId: 'batch',
      rowNumber: 2,
      action: 'UPSERT',
      guestName: 'VIP',
      disposition: GuestListRowDisposition.IMPORTED,
      guestEntryId: 'guest',
    };
    const tx = {
      guestListImportRow: {
        findUnique: vi.fn().mockResolvedValue(evidence),
        create: vi.fn(),
      },
      guestListEntry: { findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
    };
    const prisma = { $transaction: vi.fn((callback) => callback(tx)) };
    await expect(
      new PrismaGuestListRepository(prisma as never).applyRow(
        { id: 'batch', concertId: 'concert' } as never,
        {
          rowNumber: 2,
          action: 'UPSERT',
          guestName: 'Changed',
          normalizedEmail: 'vip@x.test',
          disposition: GuestListRowDisposition.UPDATED,
        },
      ),
    ).resolves.toMatchObject({
      disposition: GuestListRowDisposition.IMPORTED,
      guestEntryId: 'guest',
    });
    expect(tx.guestListEntry.findMany).not.toHaveBeenCalled();
    expect(tx.guestListImportRow.create).not.toHaveBeenCalled();
  });
});
