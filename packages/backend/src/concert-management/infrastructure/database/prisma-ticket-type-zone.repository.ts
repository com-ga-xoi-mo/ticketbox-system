import { Injectable } from '@nestjs/common';
import { type SeatingZone as PrismaSeatingZone } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import type { TicketTypeZoneRepositoryPort } from '../../domain/ports/ticket-type-zone.port';
import type { SeatingZone, SeatingZoneStatusValue } from '../../domain/seating-map.types';

@Injectable()
export class PrismaTicketTypeZoneRepository implements TicketTypeZoneRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async replaceForTicketType(
    concertId: string,
    ticketTypeId: string,
    seatingZoneIds: string[],
  ): Promise<SeatingZone[]> {
    await this.prisma.$transaction([
      this.prisma.ticketTypeZone.deleteMany({
        where: { concertId, ticketTypeId },
      }),
      this.prisma.ticketTypeZone.createMany({
        data: seatingZoneIds.map((seatingZoneId) => ({
          concertId,
          ticketTypeId,
          seatingZoneId,
        })),
        skipDuplicates: true,
      }),
    ]);

    return this.findByTicketTypeId(ticketTypeId);
  }

  async findByTicketTypeId(ticketTypeId: string): Promise<SeatingZone[]> {
    const mappings = await this.prisma.ticketTypeZone.findMany({
      where: { ticketTypeId },
      orderBy: { createdAt: 'asc' },
      include: { seatingZone: true },
    });

    return mappings.map((mapping) => this.toDomain(mapping.seatingZone));
  }

  private toDomain(record: PrismaSeatingZone): SeatingZone {
    return {
      id: record.id,
      concertId: record.concertId,
      svgElementId: record.svgElementId,
      label: record.label,
      color: record.color,
      displayOrder: record.displayOrder,
      status: record.status as SeatingZoneStatusValue,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
