import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service';
import { IResaleOrderRepository, ResaleOrderData } from '../../../domain/ports/p2p-order/resale-order-repository.port';
import { ResaleOrderStatus } from '../../../domain/resale-order-status';

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

  async cancelWithRefund(orderId: string): Promise<ResaleOrderData> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.resaleOrder.findUnique({ where: { id: orderId } });
      if (!order) throw new Error('Order not found');

      const updated = await tx.resaleOrder.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date()
        }
      });

      await tx.resaleListing.update({
        where: { id: order.listingId },
        data: {
          status: 'ACTIVE'
        }
      });

      return updated;
    });
  }

  async resolveDispute(orderId: string, outcome: 'complete' | 'cancel', note: string): Promise<ResaleOrderData> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.resaleOrder.findUnique({ where: { id: orderId } });
      if (!order) throw new Error('Order not found');

      const newStatus = outcome === 'complete' ? 'COMPLETED' : 'CANCELLED';
      const updated = await tx.resaleOrder.update({
        where: { id: order.id },
        data: {
          status: newStatus as any,
          resolutionNote: note,
          resolvedAt: new Date(),
          ...(outcome === 'complete' ? { completedAt: new Date() } : { cancelledAt: new Date() })
        }
      });

      if (outcome === 'cancel') {
        await tx.resaleListing.update({
          where: { id: order.listingId },
          data: { status: 'ACTIVE' }
        });

        const buyer = await tx.user.update({
          where: { id: order.buyerId },
          data: { buyerViolationCount: { increment: 1 } }
        });

        if (buyer.buyerViolationCount >= 3) {
          await tx.user.update({
            where: { id: order.buyerId },
            data: { resaleMarketSuspendedAt: new Date() }
          });
        }
      }

      return updated;
    });
  }

  async reserveForOrder(listingId: string, buyerId: string, sellerId: string): Promise<ResaleOrderData> {
    return this.prisma.$transaction(async (tx) => {
      const listingRows = await tx.$queryRawUnsafe<any[]>(`SELECT * FROM resale_listings WHERE id = $1::uuid FOR UPDATE`, listingId);
      if (!listingRows.length) {
        throw new Error('LISTING_NOT_FOUND');
      }
      const listing = listingRows[0];

      if (listing.status !== 'ACTIVE') {
        throw new Error('LISTING_NOT_AVAILABLE');
      }

      await tx.$queryRawUnsafe(`UPDATE resale_listings SET status = 'RESERVED' WHERE id = $1::uuid`, listingId);

      const order = await tx.resaleOrder.create({
        data: {
          listingId,
          buyerId,
          sellerId,
          status: 'RESERVED',
        }
      });

      return order;
    });
  }
}
