import type {
  ConcertReview,
  ConcertReviewConcertRef,
  ConcertReviewInput,
  ConcertReviewSummary,
} from '../concert-review.types';

export const CONCERT_REVIEW_REPOSITORY = Symbol('CONCERT_REVIEW_REPOSITORY');

export interface ConcertReviewRepositoryPort {
  findPublishedConcertBySlug(slug: string): Promise<ConcertReviewConcertRef | null>;
  findConcertById(concertId: string): Promise<ConcertReviewConcertRef | null>;
  hasIssuedTicket(userId: string, concertId: string): Promise<boolean>;
  findByConcertAndUser(concertId: string, userId: string): Promise<ConcertReview | null>;
  listVisible(concertId: string): Promise<ConcertReview[]>;
  getVisibleSummary(concertId: string): Promise<ConcertReviewSummary>;
  create(concertId: string, userId: string, input: ConcertReviewInput): Promise<ConcertReview>;
  updateOwn(concertId: string, userId: string, input: ConcertReviewInput): Promise<ConcertReview>;
  deleteOwn(concertId: string, userId: string): Promise<boolean>;
  hide(
    concertId: string,
    reviewId: string,
    hiddenByUserId: string,
    reason?: string,
  ): Promise<ConcertReview | null>;
}
