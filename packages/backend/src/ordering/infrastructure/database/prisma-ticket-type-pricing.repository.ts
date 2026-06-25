import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  TicketTypePricingRecord,
  TicketTypePricingRepositoryPort,
} from '../../domain/ports/ticket-type-pricing.port';

@Injectable()
export class PrismaTicketTypePricingRepository implements TicketTypePricingRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPricingByConcertAndTicketTypeIds(
    concertId: string,
    ticketTypeIds: string[],
  ): Promise<TicketTypePricingRecord[]> {
    const ticketTypes = await this.prisma.ticketType.findMany({
      where: {
        concertId,
        id: { in: ticketTypeIds },
      },
      select: {
        id: true,
        name: true,
        concertId: true,
        priceVnd: true,
      },
    });

    return ticketTypes.map((ticketType) => ({
      ticketTypeId: ticketType.id,
      ticketTypeName: ticketType.name,
      concertId: ticketType.concertId,
      unitPriceVnd: ticketType.priceVnd,
    }));
  }
}
