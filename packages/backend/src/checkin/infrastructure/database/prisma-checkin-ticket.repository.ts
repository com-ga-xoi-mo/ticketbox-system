import { Injectable } from '@nestjs/common';
import {
  CheckinEventResult,
  CheckinEventSource,
  Prisma,
  TicketStatus,
} from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  AcceptedScanPersistenceResult,
  CheckinTicketRecord,
  RecordAcceptedScanInput,
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

  async recordAcceptedScan(
    input: RecordAcceptedScanInput,
  ): Promise<AcceptedScanPersistenceResult> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const ticket = await tx.ticket.findUnique({
          where: { id: input.ticketId },
        });

        if (!ticket || ticket.checkedInAt || ticket.status === TicketStatus.CHECKED_IN) {
          return {
            status: 'duplicate' as const,
            ticketId: input.ticketId,
            checkedInAt: ticket?.checkedInAt ?? undefined,
          };
        }

        const event = await tx.checkinEvent.create({
          data: {
            ticketId: input.ticketId,
            concertId: input.concertId,
            staffId: input.staffId,
            source: CheckinEventSource.ONLINE,
            result: CheckinEventResult.ACCEPTED,
            scannedQrHash: input.scannedQrHash,
            deviceId: input.deviceId ?? null,
            occurredAt: input.occurredAt,
          },
        });

        const checkedInAt = new Date();
        await tx.ticket.update({
          where: { id: input.ticketId },
          data: {
            status: TicketStatus.CHECKED_IN,
            checkedInAt,
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

  async recordRejectedScan(
    input: RecordRejectedScanInput,
  ): Promise<{ id: string } | null> {
    try {
      const event = await this.prisma.checkinEvent.create({
        data: {
          ticketId: input.ticketId ?? null,
          concertId: input.concertId,
          staffId: input.staffId,
          source: CheckinEventSource.ONLINE,
          result: input.result as CheckinEventResult,
          scannedQrHash: input.scannedQrHash,
          deviceId: input.deviceId ?? null,
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
