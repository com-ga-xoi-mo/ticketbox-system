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
      create: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let tx: {
    ticket: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    checkinEvent: {
      create: ReturnType<typeof vi.fn>;
    };
  };
  let repository: PrismaCheckinTicketRepository;

  beforeEach(() => {
    tx = {
      ticket: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      checkinEvent: {
        create: vi.fn(),
      },
    };
    prisma = {
      ticket: {
        findUnique: vi.fn(),
      },
      checkinEvent: {
        findFirst: vi.fn(),
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
    tx.ticket.findUnique.mockResolvedValue(makeTicket());
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
    expect(tx.ticket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1' },
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
