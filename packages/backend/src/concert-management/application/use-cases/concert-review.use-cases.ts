import { Inject, Injectable } from '@nestjs/common';

import {
  ConcertReviewConcertNotFoundError,
  ConcertReviewDuplicateError,
  ConcertReviewMissingIssuedTicketError,
  ConcertReviewNotFoundError,
  ConcertReviewValidationError,
} from '../../domain/concert-review.errors';
import type { ConcertReview, ConcertReviewInput } from '../../domain/concert-review.types';
import {
  CONCERT_REVIEW_REPOSITORY,
  type ConcertReviewRepositoryPort,
} from '../../domain/ports/concert-review.port';

export interface ConcertReviewsResult {
  summary: {
    averageRating: number | null;
    reviewCount: number;
  };
  reviews: ConcertReview[];
}

function normalizeReviewInput(input: ConcertReviewInput): ConcertReviewInput {
  const rating = Number(input.rating);
  const comment = input.comment?.trim() ?? '';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ConcertReviewValidationError('Rating must be an integer from 1 to 5');
  }
  if (comment.length < 1 || comment.length > 1000) {
    throw new ConcertReviewValidationError('Comment must be between 1 and 1000 characters');
  }
  return { rating, comment };
}

function normalizeHiddenReason(reason?: string): string | undefined {
  const normalized = reason?.trim();
  if (!normalized) return undefined;
  if (normalized.length > 500) {
    throw new ConcertReviewValidationError('Hidden reason must be 500 characters or fewer');
  }
  return normalized;
}

@Injectable()
export class ListConcertReviewsUseCase {
  constructor(
    @Inject(CONCERT_REVIEW_REPOSITORY)
    private readonly reviews: ConcertReviewRepositoryPort,
  ) {}

  async execute(slug: string): Promise<ConcertReviewsResult> {
    const concert = await this.reviews.findPublishedConcertBySlug(slug);
    if (!concert) {
      throw new ConcertReviewConcertNotFoundError();
    }
    const [summary, reviews] = await Promise.all([
      this.reviews.getVisibleSummary(concert.id),
      this.reviews.listVisible(concert.id),
    ]);
    return { summary, reviews };
  }
}

@Injectable()
export class CreateConcertReviewUseCase {
  constructor(
    @Inject(CONCERT_REVIEW_REPOSITORY)
    private readonly reviews: ConcertReviewRepositoryPort,
  ) {}

  async execute(slug: string, userId: string, input: ConcertReviewInput): Promise<ConcertReview> {
    const normalized = normalizeReviewInput(input);
    const concert = await this.reviews.findPublishedConcertBySlug(slug);
    if (!concert) {
      throw new ConcertReviewConcertNotFoundError();
    }
    const hasTicket = await this.reviews.hasIssuedTicket(userId, concert.id);
    if (!hasTicket) {
      throw new ConcertReviewMissingIssuedTicketError();
    }
    const existing = await this.reviews.findByConcertAndUser(concert.id, userId);
    if (existing) {
      throw new ConcertReviewDuplicateError();
    }
    return this.reviews.create(concert.id, userId, normalized);
  }
}

@Injectable()
export class UpdateMyConcertReviewUseCase {
  constructor(
    @Inject(CONCERT_REVIEW_REPOSITORY)
    private readonly reviews: ConcertReviewRepositoryPort,
  ) {}

  async execute(slug: string, userId: string, input: ConcertReviewInput): Promise<ConcertReview> {
    const normalized = normalizeReviewInput(input);
    const concert = await this.reviews.findPublishedConcertBySlug(slug);
    if (!concert) {
      throw new ConcertReviewConcertNotFoundError();
    }
    const existing = await this.reviews.findByConcertAndUser(concert.id, userId);
    if (!existing || existing.status === 'HIDDEN') {
      throw new ConcertReviewNotFoundError();
    }
    return this.reviews.updateOwn(concert.id, userId, normalized);
  }
}

@Injectable()
export class DeleteMyConcertReviewUseCase {
  constructor(
    @Inject(CONCERT_REVIEW_REPOSITORY)
    private readonly reviews: ConcertReviewRepositoryPort,
  ) {}

  async execute(slug: string, userId: string): Promise<{ deleted: true }> {
    const concert = await this.reviews.findPublishedConcertBySlug(slug);
    if (!concert) {
      throw new ConcertReviewConcertNotFoundError();
    }
    const deleted = await this.reviews.deleteOwn(concert.id, userId);
    if (!deleted) {
      throw new ConcertReviewNotFoundError();
    }
    return { deleted: true };
  }
}

@Injectable()
export class HideConcertReviewUseCase {
  constructor(
    @Inject(CONCERT_REVIEW_REPOSITORY)
    private readonly reviews: ConcertReviewRepositoryPort,
  ) {}

  async execute(
    concertId: string,
    reviewId: string,
    hiddenByUserId: string,
    reason?: string,
  ): Promise<ConcertReview> {
    const concert = await this.reviews.findConcertById(concertId);
    if (!concert) {
      throw new ConcertReviewConcertNotFoundError();
    }
    const review = await this.reviews.hide(
      concertId,
      reviewId,
      hiddenByUserId,
      normalizeHiddenReason(reason),
    );
    if (!review) {
      throw new ConcertReviewNotFoundError();
    }
    return review;
  }
}
