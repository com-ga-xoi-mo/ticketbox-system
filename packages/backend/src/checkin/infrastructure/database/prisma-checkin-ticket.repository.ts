import { Injectable } from '@nestjs/common';
import { CheckinEventResult, CheckinEventSource, Prisma, TicketStatus } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  AcceptedScanPersistenceResult,
  CheckinTicketRecord,
  RecordAcceptedScanInput,
  PersistedOfflineEvent,
  RecordOfflineOutcomeInput,
  RecordRejectedScanInput,
} from '../../domain/checkin-scan.types';
import type { CheckinTicketRepositoryPort } from '../../domain/ports/checkin-ticket-repository.port';

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

function isPrismaUniqueError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === PRISMA_UNIQUE_CONSTRAINT
  );
}

@Injectable()
export class PrismaCheckinTicketRepository implements CheckinTicketRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByQrTokenHash(qrTokenHash: string): Promise<CheckinTicketRecord | null> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { qrTokenHash },
    });

    return ticket ? this.toTicketRecord(ticket) : null;
  }

  async hasAcceptedCheckin(ticketId: string): Promise<boolean> {
    const accepted = await this.prisma.checkinEvent.findFirst({
      where: {
        ticketId,
        result: CheckinEventResult.ACCEPTED,
      },
      select: { id: true },
    });

    return accepted !== null;
  }

  async recordAcceptedScan(input: RecordAcceptedScanInput): Promise<AcceptedScanPersistenceResult> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const checkedInAt = new Date();
        const claim = await tx.ticket.updateMany({
          where: {
            id: input.ticketId,
            status: TicketStatus.ISSUED,
            checkedInAt: null,
          },
          data: { status: TicketStatus.CHECKED_IN, checkedInAt },
        });

        if (claim.count === 0) {
          const [ticket, acceptedEvent] = await Promise.all([
            tx.ticket.findUnique({ where: { id: input.ticketId }, select: { checkedInAt: true } }),
            tx.checkinEvent.findFirst({
              where: { ticketId: input.ticketId, result: CheckinEventResult.ACCEPTED },
              orderBy: { createdAt: 'asc' },
              select: { id: true, deviceId: true },
            }),
          ]);
          return {
            status: 'duplicate' as const,
            ticketId: input.ticketId,
            checkinEventId: acceptedEvent?.id,
            checkedInAt: ticket?.checkedInAt ?? undefined,
            acceptedByDeviceId: acceptedEvent?.deviceId ?? undefined,
          };
        }

        const event = await tx.checkinEvent.create({
          data: {
            ticketId: input.ticketId,
            concertId: input.concertId,
            staffId: input.staffId,
            source:
              input.source === 'OFFLINE_SYNC'
                ? CheckinEventSource.OFFLINE_SYNC
                : CheckinEventSource.ONLINE,
            result: CheckinEventResult.ACCEPTED,
            scannedQrHash: input.scannedQrHash,
            deviceId: input.deviceId,
            offlineEventId: input.offlineEventId ?? null,
            occurredAt: input.occurredAt,
            syncedAt: input.syncedAt ?? null,
          },
        });

        return {
          status: 'accepted' as const,
          ticketId: input.ticketId,
          checkinEventId: event.id,
          checkedInAt,
        };
      });

      return result;
    } catch (err: unknown) {
      if (isPrismaUniqueError(err)) {
        return {
          status: 'duplicate',
          ticketId: input.ticketId,
        };
      }
      throw err;
    }
  }

  async findOfflineEvent(deviceId: string, localId: string): Promise<PersistedOfflineEvent | null> {
    const event = await this.prisma.checkinEvent.findUnique({
      where: { deviceId_offlineEventId: { deviceId, offlineEventId: localId } },
      select: {
        staffId: true,
        ticketId: true,
        result: true,
        rejectionReason: true,
        ticket: { select: { checkedInAt: true } },
      },
    });
    if (!event) return null;
    return {
      staffId: event.staffId,
      ticketId: event.ticketId ?? undefined,
      result: event.result,
      rejectionReason: event.rejectionReason ?? undefined,
      checkedInAt: event.ticket?.checkedInAt ?? undefined,
    };
  }

  async recordOfflineOutcome(
    input: RecordOfflineOutcomeInput,
  ): Promise<PersistedOfflineEvent | null> {
    try {
      await this.prisma.checkinEvent.create({
        data: {
          ticketId: input.ticketId ?? null,
          concertId: input.concertId,
          staffId: input.staffId,
          source: CheckinEventSource.OFFLINE_SYNC,
          result: input.result as CheckinEventResult,
          scannedQrHash: input.scannedQrHash,
          deviceId: input.deviceId,
          offlineEventId: input.localId,
          occurredAt: input.occurredAt,
          syncedAt: input.syncedAt,
          rejectionReason: input.rejectionReason ?? null,
        },
      });
      return null;
    } catch (err: unknown) {
      // The upfront findOfflineEvent lookup and this write are not in one
      // transaction (TOCTOU). A concurrent/replayed identical event can reach
      // here and collide on the @@unique([deviceId, offlineEventId]) index.
      // Resolve a known duplicate/replay to its stored deterministic outcome
      // instead of surfacing HTTP 5xx; genuine infrastructure errors propagate.
      if (isPrismaUniqueError(err)) {
        const persisted = await this.findOfflineEvent(input.deviceId, input.localId);
        if (persisted) {
          return persisted;
        }
      }
      throw err;
    }
  }

  async recordRejectedScan(input: RecordRejectedScanInput): Promise<{ id: string } | null> {
    try {
      const event = await this.prisma.checkinEvent.create({
        data: {
          ticketId: input.ticketId ?? null,
          concertId: input.concertId,
          staffId: input.staffId,
          source: CheckinEventSource.ONLINE,
          result: input.result as CheckinEventResult,
          scannedQrHash: input.scannedQrHash,
          deviceId: input.deviceId,
          occurredAt: input.occurredAt,
          rejectionReason: input.rejectionReason ?? null,
        },
      });

      return { id: event.id };
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        return null;
      }
      throw err;
    }
  }

  private toTicketRecord(ticket: {
    id: string;
    concertId: string;
    status: TicketStatus;
    checkedInAt: Date | null;
    qrTokenHash: string;
  }): CheckinTicketRecord {
    return {
      id: ticket.id,
      concertId: ticket.concertId,
      status: ticket.status,
      checkedInAt: ticket.checkedInAt ?? undefined,
      qrTokenHash: ticket.qrTokenHash,
    };
  }
}
