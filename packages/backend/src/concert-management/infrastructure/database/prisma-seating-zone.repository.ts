import { Injectable } from '@nestjs/common';
import { SeatingZoneStatus, type SeatingZone as PrismaSeatingZone } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import type { SeatingZoneRepositoryPort } from '../../domain/ports/seating-zone.port';
import type {
  SeatingZone,
  SeatingZoneStatusValue,
  UpsertSeatingZoneInput,
} from '../../domain/seating-map.types';

@Injectable()
export class PrismaSeatingZoneRepository implements SeatingZoneRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async upsertMany(concertId: string, zones: UpsertSeatingZoneInput[]): Promise<SeatingZone[]> {
    const records = await this.prisma.$transaction(
      zones.map((zone) =>
        this.prisma.seatingZone.upsert({
          where: {
            concertId_svgElementId: {
              concertId,
              svgElementId: zone.svgElementId,
            },
          },
          create: {
            concertId,
            svgElementId: zone.svgElementId,
            label: zone.label,
            color: zone.color ?? null,
            displayOrder: zone.displayOrder,
            status: (zone.status as SeatingZoneStatus | undefined) ?? SeatingZoneStatus.ACTIVE,
          },
          update: {
            label: zone.label,
            color: zone.color ?? null,
            displayOrder: zone.displayOrder,
            status: zone.status as SeatingZoneStatus | undefined,
          },
        }),
      ),
    );

    return records.map((record) => this.toDomain(record));
  }

  async findByConcertId(concertId: string): Promise<SeatingZone[]> {
    const records = await this.prisma.seatingZone.findMany({
      where: { concertId },
      orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
    });
    return records.map((record) => this.toDomain(record));
  }

  async findByIds(ids: string[]): Promise<SeatingZone[]> {
    const records = await this.prisma.seatingZone.findMany({
      where: { id: { in: ids } },
    });
    return records.map((record) => this.toDomain(record));
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
