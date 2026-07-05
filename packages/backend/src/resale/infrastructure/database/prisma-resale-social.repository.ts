import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service';
import { IResaleSocialRepository } from '../../domain/ports/resale-social-repository.port';
import { ResaleSocialComment } from '../../domain/resale-social.entity';
import * as errors from '../../domain/errors';

@Injectable()
export class PrismaResaleSocialRepository implements IResaleSocialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async toggleUpvote(userId: string, listingId: string) {
    const listing = await this.prisma.resaleListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new errors.ListingNotFoundError(listingId);
    if (listing.status !== 'ACTIVE') throw new errors.ListingNotActiveError();
    if (listing.sellerId === userId) throw new errors.ResaleDomainError('Cannot upvote your own listing', 'CANNOT_UPVOTE_OWN_LISTING');

    let upvotedByMe = false;
    let upvoteCount = listing.upvoteCount;

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.listingUpvote.findUnique({
        where: { listingId_userId: { listingId, userId } }
      });

      if (existing) {
        await tx.listingUpvote.delete({ where: { id: existing.id } });
        upvotedByMe = false;
        upvoteCount -= 1;
      } else {
        await tx.listingUpvote.create({ data: { listingId, userId } });
        upvotedByMe = true;
        upvoteCount += 1;
      }

      await tx.resaleListing.update({ where: { id: listingId }, data: { upvoteCount } });
    });

    return { upvoteCount, upvotedByMe };
  }

  async addComment(userId: string, listingId: string, body: string): Promise<ResaleSocialComment> {
    const listing = await this.prisma.resaleListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new errors.ListingNotFoundError(listingId);
    
    let comment: any;
    let commentCount = listing.commentCount + 1;

    await this.prisma.$transaction(async (tx) => {
      comment = await tx.listingComment.create({
        data: { listingId, authorId: userId, body },
        include: { author: { select: { displayName: true } } }
      });
      await tx.resaleListing.update({ where: { id: listingId }, data: { commentCount } });
    });
    return comment as ResaleSocialComment;
  }

  async addReply(userId: string, listingId: string, commentId: string, body: string): Promise<ResaleSocialComment> {
    const comment = await this.prisma.listingComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new errors.CommentNotFoundError();

    const reply = await this.prisma.listingCommentReply.create({
      data: { commentId, authorId: userId, body },
      include: { author: { select: { displayName: true } } }
    });
    return { ...reply, listingId, parentId: commentId, isHidden: false } as any as ResaleSocialComment;
  }

  async getComments(listingId: string, page: number, limit: number): Promise<ResaleSocialComment[]> {
    const comments = await this.prisma.listingComment.findMany({
      where: { listingId, isHidden: false },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { displayName: true, avatarAssetId: true } },
        replies: {
          where: { isHidden: false },
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { displayName: true, avatarAssetId: true } } }
        }
      }
    });
    return comments as unknown as ResaleSocialComment[];
  }

  async flagComment(userId: string, commentId: string) {
    const existing = await this.prisma.commentFlag.findUnique({
      where: { commentId_flaggedByUserId: { commentId, flaggedByUserId: userId } }
    });
    if (existing) throw new errors.ResaleDomainError('Already flagged', 'ALREADY_FLAGGED');

    await this.prisma.$transaction(async (tx) => {
      await tx.commentFlag.create({ data: { commentId, flaggedByUserId: userId } });
      const comment = await tx.listingComment.findUnique({ where: { id: commentId } });
      if (comment) {
        const flagCount = comment.flagCount + 1;
        const isHidden = flagCount >= 3;
        await tx.listingComment.update({ where: { id: commentId }, data: { flagCount, isHidden } });
      }
    });
  }
}
