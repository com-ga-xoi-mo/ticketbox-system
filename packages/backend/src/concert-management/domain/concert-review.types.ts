export type ConcertReviewStatus = 'VISIBLE' | 'HIDDEN';

export interface ConcertReviewConcertRef {
  id: string;
  slug: string;
  title: string;
}

export interface ConcertReviewAuthor {
  id: string;
  displayName: string;
}

export interface ConcertReview {
  id: string;
  concertId: string;
  userId: string;
  rating: number;
  comment: string;
  status: ConcertReviewStatus;
  hiddenAt: Date | null;
  hiddenByUserId: string | null;
  hiddenReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: ConcertReviewAuthor;
}

export interface ConcertReviewSummary {
  averageRating: number | null;
  reviewCount: number;
}

export interface ConcertReviewInput {
  rating: number;
  comment: string;
}
