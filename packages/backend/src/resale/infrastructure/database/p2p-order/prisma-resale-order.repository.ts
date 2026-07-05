import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service';
import { IResaleOrderRepository, ResaleOrderData } from '../../../domain/ports/p2p-order/resale-order-repository.port';
import { ResaleOrderStatus } from '@prisma/client';

@Injectable()
export class PrismaResaleOrderRepository implements IResaleOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    listingId: string;
    buyerId: string;
    sellerId: string;
    status: ResaleOrderStatus;
  }): Promise<ResaleOrderData> {
    return this.prisma.resaleOrder.create({ data });
  }

  async findById(id: string): Promise<ResaleOrderData | null> {
    return this.prisma.resaleOrder.findUnique({ where: { id } });
  }

  async updateStatus(id: string, status: ResaleOrderStatus, extraFields?: Partial<ResaleOrderData>): Promise<ResaleOrderData> {
    return this.prisma.resaleOrder.update({
      where: { id },
      data: {
        status,
        ...extraFields
      }
    });
  }

  async findActiveByListingId(listingId: string): Promise<ResaleOrderData | null> {
    return this.prisma.resaleOrder.findFirst({
      where: {
        listingId,
        status: {
          in: ['RESERVED', 'PENDING_CONFIRM', 'IN_DISPUTE']
        }
      }
    });
  }
}
