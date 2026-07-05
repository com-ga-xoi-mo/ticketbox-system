import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service';
import { IResaleMessagingRepository } from '../../domain/ports/resale-messaging-repository.port';
import * as errors from '../../domain/errors';

@Injectable()
export class PrismaResaleMessagingRepository implements IResaleMessagingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async sendMessage(userId: string, listingId: string, body: string, threadId?: string) {
    if (!body || body.trim().length === 0 || body.length > 1000) throw new errors.InvalidMessageBodyError();

    const listing = await this.prisma.resaleListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new errors.ListingNotFoundError(listingId);

    let thread;
    let isFirstSellerReply = false;

    if (threadId) {
      thread = await this.prisma.directMessageThread.findUnique({ 
        where: { id: threadId },
        include: { messages: { take: 1, where: { senderId: listing.sellerId } } } 
      });
      if (!thread) throw new errors.ThreadNotFoundError();
      if (thread.buyerId !== userId && thread.sellerId !== userId) throw new errors.NotParticipantError();
      if (userId === listing.sellerId && thread.messages.length === 0) isFirstSellerReply = true;
    } else {
      if (listing.sellerId === userId) throw new errors.SellerCannotInitiateThreadError();
      thread = await this.prisma.directMessageThread.findUnique({
        where: { listingId_buyerId_sellerId: { listingId, buyerId: userId, sellerId: listing.sellerId } }
      });
      if (!thread) {
        thread = await this.prisma.directMessageThread.create({
          data: { listingId, buyerId: userId, sellerId: listing.sellerId, lastMessageAt: new Date() }
        });
      }
    }

    if (thread.isClosed) throw new errors.ThreadClosedError();

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.directMessage.create({
        data: { threadId: thread.id, senderId: userId, body: body.trim() }
      });
      await tx.directMessageThread.update({
        where: { id: thread.id },
        data: { lastMessageAt: new Date() }
      });
      return created;
    });

    return { message, thread, isFirstSellerReply, listing };
  }

  async getMyThreads(userId: string) {
    const threads = await this.prisma.directMessageThread.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        listing: { include: { concert: true, ticketType: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    return Promise.all(threads.map(async t => {
      const unreadCount = await this.prisma.directMessage.count({
        where: { threadId: t.id, senderId: { not: userId }, isReadByRecipient: false }
      });
      return { ...t, unreadCount };
    }));
  }

  async getThreadMessages(userId: string, threadId: string) {
    const thread = await this.prisma.directMessageThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new errors.ThreadNotFoundError();
    if (thread.buyerId !== userId && thread.sellerId !== userId) throw new errors.NotParticipantError();

    await this.prisma.directMessage.updateMany({
      where: { threadId, senderId: { not: userId }, isReadByRecipient: false },
      data: { isReadByRecipient: true }
    });

    return this.prisma.directMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' }
    });
  }
}
