import { CheckinEventResult, CheckinEventSource, TicketStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaCheckinTicketRepository } from './prisma-checkin-ticket.repository';

const occurredAt = new Date('2026-06-17T10:00:00.000Z');

function makeTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ticket-1',
    concertId: 'concert-1',
    status: TicketStatus.ISSUED,
    checkedInAt: null,
    qrTokenHash: 'hash-1',
    ...overrides,
  };
}

describe('PrismaCheckinTicketRepository', () => {
  let prisma: {
    ticket: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    checkinEvent: {
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let tx: {
    ticket: {
      findUnique: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    checkinEvent: {
      create: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
  };
  let repository: PrismaCheckinTicketRepository;

  beforeEach(() => {
    tx = {
      ticket: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      checkinEvent: {
        create: vi.fn(),
        findFirst: vi.fn(),
      },
    };
    prisma = {
      ticket: {
        findUnique: vi.fn(),
      },
      checkinEvent: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn((callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    repository = new PrismaCheckinTicketRepository(prisma as never);
  });

  it('looks up issued tickets by QR token hash', async () => {
    prisma.ticket.findUnique.mockResolvedValue(makeTicket());

    await expect(repository.findByQrTokenHash('hash-1')).resolves.toMatchObject({
      id: 'ticket-1',
      status: 'ISSUED',
    });

    expect(prisma.ticket.findUnique).toHaveBeenCalledWith({
      where: { qrTokenHash: 'hash-1' },
    });
  });

  it('persists accepted scans in a transaction and updates the ticket', async () => {
    tx.ticket.updateMany.mockResolvedValue({ count: 1 });
    tx.checkinEvent.create.mockResolvedValue({ id: 'event-1' });

    await expect(
      repository.recordAcceptedScan({
        ticketId: 'ticket-1',
        concertId: 'concert-1',
        staffId: 'staff-1',
        scannedQrHash: 'hash-1',
        deviceId: 'device-1',
        occurredAt,
      }),
    ).resolves.toMatchObject({
      status: 'accepted',
      ticketId: 'ticket-1',
      checkinEventId: 'event-1',
    });

    expect(tx.checkinEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: CheckinEventSource.ONLINE,
        result: CheckinEventResult.ACCEPTED,
      }),
    });
    expect(tx.ticket.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'ticket-1',
        status: TicketStatus.ISSUED,
        checkedInAt: null,
      }),
      data: expect.objectContaining({ status: TicketStatus.CHECKED_IN }),
    });
  });

  it('maps an accepted-check-in unique violation to duplicate', async () => {
    prisma.$transaction.mockRejectedValue({ code: 'P2002' });

    await expect(
      repository.recordAcceptedScan({
        ticketId: 'ticket-1',
        concertId: 'concert-1',
        staffId: 'staff-1',
        scannedQrHash: 'hash-1',
        deviceId: 'device-1',
        occurredAt,
      }),
    ).resolves.toMatchObject({
      status: 'duplicate',
      ticketId: 'ticket-1',
    });
  });

  it('returns claim loss metadata without creating another accepted event', async () => {
    tx.ticket.updateMany.mockResolvedValue({ count: 0 });
    tx.ticket.findUnique.mockResolvedValue({ checkedInAt: occurredAt });
    tx.checkinEvent.findFirst.mockResolvedValue({ id: 'accepted-event', deviceId: 'device-2' });

    await expect(
      repository.recordAcceptedScan({
        ticketId: 'ticket-1',
        concertId: 'concert-1',
        staffId: 'staff-1',
        scannedQrHash: 'hash-1',
        deviceId: 'device-1',
        occurredAt,
      }),
    ).resolves.toMatchObject({
      status: 'duplicate',
      acceptedByDeviceId: 'device-2',
      checkinEventId: 'accepted-event',
    });
    expect(tx.checkinEvent.create).not.toHaveBeenCalled();
  });

  it('propagates accepted-event persistence failure so the transaction can roll back the claim', async () => {
    tx.ticket.updateMany.mockResolvedValue({ count: 1 });
    tx.checkinEvent.create.mockRejectedValue(new Error('event write failed'));
    await expect(
      repository.recordAcceptedScan({
        ticketId: 'ticket-1',
        concertId: 'concert-1',
        staffId: 'staff-1',
        scannedQrHash: 'hash-1',
        deviceId: 'device-1',
        occurredAt,
      }),
    ).rejects.toThrow('event write failed');
  });

  it('persists and replays account-owned offline outcomes by exact device/local identity', async () => {
    prisma.checkinEvent.create.mockResolvedValue({ id: 'offline-event' });
    await repository.recordOfflineOutcome({
      localId: 'local-1',
      ticketId: 'ticket-1',
      concertId: 'concert-1',
      staffId: 'staff-1',
      scannedQrHash: 'hash-1',
      deviceId: 'device-1',
      occurredAt,
      syncedAt: occurredAt,
      result: 'CONFLICT',
      rejectionReason: 'Other device',
    });
    expect(prisma.checkinEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: CheckinEventSource.OFFLINE_SYNC,
        offlineEventId: 'local-1',
        occurredAt,
        syncedAt: occurredAt,
      }),
    });

    prisma.checkinEvent.findUnique.mockResolvedValue({
      staffId: 'staff-1',
      ticketId: 'ticket-1',
      result: CheckinEventResult.CONFLICT,
      rejectionReason: 'Other device',
      ticket: { checkedInAt: occurredAt },
    });
    await expect(repository.findOfflineEvent('device-1', 'local-1')).resolves.toMatchObject({
      staffId: 'staff-1',
      result: 'CONFLICT',
    });
    expect(prisma.checkinEvent.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deviceId_offlineEventId: { deviceId: 'device-1', offlineEventId: 'local-1' } },
      }),
    );
  });

  it('records rejected scan attempts for authenticated staff', async () => {
    prisma.checkinEvent.create.mockResolvedValue({ id: 'event-rejected' });

    await expect(
      repository.recordRejectedScan({
        ticketId: 'ticket-1',
        concertId: 'concert-1',
        staffId: 'staff-1',
        scannedQrHash: 'hash-1',
        deviceId: 'device-1',
        occurredAt,
        result: 'WRONG_CONCERT',
        rejectionReason: 'WRONG_CONCERT',
      }),
    ).resolves.toEqual({ id: 'event-rejected' });

    expect(prisma.checkinEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        result: CheckinEventResult.WRONG_CONCERT,
        rejectionReason: 'WRONG_CONCERT',
      }),
    });
  });
});
