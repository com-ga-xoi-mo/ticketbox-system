import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service';
import { IResaleTicketProvider } from '../../domain/ports/resale-ticket-provider.port';

@Injectable()
export class PrismaResaleTicketProvider implements IResaleTicketProvider {
  constructor(private readonly prisma: PrismaService) {}

  async findTicketById(id: string) {
    return this.prisma.ticket.findUnique({
      where: { id },
      include: { concert: true, ticketType: true }
    });
  }
}
