import type { ConcertReview } from '../../domain/concert-review.types';

export function presentConcertReview(review: ConcertReview) {
  return {
    id: review.id,
    concertId: review.concertId,
    rating: review.rating,
    comment: review.comment,
    author: review.author,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}
