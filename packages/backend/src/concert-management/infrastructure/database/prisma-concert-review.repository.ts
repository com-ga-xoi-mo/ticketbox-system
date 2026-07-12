import { Injectable } from '@nestjs/common';
import { ConcertReviewStatus, ConcertStatus, Prisma, TicketStatus } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import { ConcertReviewDuplicateError, ConcertReviewNotFoundError } from '../../domain/concert-review.errors';
import type {
  ConcertReview,
  ConcertReviewConcertRef,
  ConcertReviewInput,
  ConcertReviewSummary,
} from '../../domain/concert-review.types';
import type { ConcertReviewRepositoryPort } from '../../domain/ports/concert-review.port';

const reviewInclude = {
  user: {
    select: {
      id: true,
      displayName: true,
    },
  },
} satisfies Prisma.ConcertReviewInclude;

type ReviewRecord = Prisma.ConcertReviewGetPayload<{ include: typeof reviewInclude }>;

@Injectable()
export class PrismaConcertReviewRepository implements ConcertReviewRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPublishedConcertBySlug(slug: string): Promise<ConcertReviewConcertRef | null> {
    const concert = await this.prisma.concert.findFirst({
      where: { slug, status: ConcertStatus.PUBLISHED },
      select: { id: true, slug: true, title: true },
    });
    return concert;
  }

  async findConcertById(concertId: string): Promise<ConcertReviewConcertRef | null> {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { id: true, slug: true, title: true },
    });
    return concert;
  }

  async hasIssuedTicket(userId: string, concertId: string): Promise<boolean> {
    const count = await this.prisma.ticket.count({
      where: {
        userId,
        concertId,
        status: TicketStatus.ISSUED,
      },
      take: 1,
    });
    return count > 0;
  }

  async findByConcertAndUser(concertId: string, userId: string): Promise<ConcertReview | null> {
    const review = await this.prisma.concertReview.findUnique({
      where: { concertId_userId: { concertId, userId } },
      include: reviewInclude,
    });
    return review ? this.toDomain(review) : null;
  }

  async listVisible(concertId: string): Promise<ConcertReview[]> {
    const reviews = await this.prisma.concertReview.findMany({
      where: { concertId, status: ConcertReviewStatus.VISIBLE },
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
    });
    return reviews.map((review) => this.toDomain(review));
  }

  async getVisibleSummary(concertId: string): Promise<ConcertReviewSummary> {
    const [aggregate, count] = await Promise.all([
      this.prisma.concertReview.aggregate({
        where: { concertId, status: ConcertReviewStatus.VISIBLE },
        _avg: { rating: true },
      }),
      this.prisma.concertReview.count({
        where: { concertId, status: ConcertReviewStatus.VISIBLE },
      }),
    ]);
    const average = aggregate._avg.rating;
    return {
      averageRating: average === null ? null : Math.round(average * 10) / 10,
      reviewCount: count,
    };
  }

  async create(
    concertId: string,
    userId: string,
    input: ConcertReviewInput,
  ): Promise<ConcertReview> {
    try {
      const review = await this.prisma.concertReview.create({
        data: {
          concertId,
          userId,
          rating: input.rating,
          comment: input.comment,
        },
        include: reviewInclude,
      });
      return this.toDomain(review);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConcertReviewDuplicateError();
      }
      throw err;
    }
  }

  async updateOwn(
    concertId: string,
    userId: string,
    input: ConcertReviewInput,
  ): Promise<ConcertReview> {
    try {
      const review = await this.prisma.concertReview.update({
        where: { concertId_userId: { concertId, userId } },
        data: {
          rating: input.rating,
          comment: input.comment,
        },
        include: reviewInclude,
      });
      return this.toDomain(review);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new ConcertReviewNotFoundError();
      }
      throw err;
    }
  }

  async deleteOwn(concertId: string, userId: string): Promise<boolean> {
    try {
      await this.prisma.concertReview.delete({
        where: { concertId_userId: { concertId, userId } },
      });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return false;
      }
      throw err;
    }
  }

  async hide(
    concertId: string,
    reviewId: string,
    hiddenByUserId: string,
    reason?: string,
  ): Promise<ConcertReview | null> {
    const result = await this.prisma.concertReview.updateMany({
      where: { id: reviewId, concertId },
      data: {
        status: ConcertReviewStatus.HIDDEN,
        hiddenAt: new Date(),
        hiddenByUserId,
        hiddenReason: reason ?? null,
      },
    });
    if (result.count === 0) {
      return null;
    }
    const review = await this.prisma.concertReview.findUnique({
      where: { id: reviewId },
      include: reviewInclude,
    });
    return review ? this.toDomain(review) : null;
  }

  private toDomain(review: ReviewRecord): ConcertReview {
    return {
      id: review.id,
      concertId: review.concertId,
      userId: review.userId,
      rating: review.rating,
      comment: review.comment,
      status: review.status,
      hiddenAt: review.hiddenAt,
      hiddenByUserId: review.hiddenByUserId,
      hiddenReason: review.hiddenReason,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      author: {
        id: review.user.id,
        displayName: review.user.displayName,
      },
    };
  }
}
