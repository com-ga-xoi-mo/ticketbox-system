import { describe, expect, it, vi } from 'vitest';

import {
  CreateConcertReviewUseCase,
  DeleteMyConcertReviewUseCase,
  HideConcertReviewUseCase,
  ListConcertReviewsUseCase,
  UpdateMyConcertReviewUseCase,
} from './concert-review.use-cases';
import {
  ConcertReviewDuplicateError,
  ConcertReviewMissingIssuedTicketError,
  ConcertReviewNotFoundError,
  ConcertReviewValidationError,
} from '../../domain/concert-review.errors';
import type { ConcertReview } from '../../domain/concert-review.types';
import type { ConcertReviewRepositoryPort } from '../../domain/ports/concert-review.port';

const concert = { id: 'concert-1', slug: 'concert-slug', title: 'Concert' };

function review(overrides: Partial<ConcertReview> = {}): ConcertReview {
  return {
    id: 'review-1',
    concertId: concert.id,
    userId: 'user-1',
    rating: 5,
    comment: 'Great event',
    status: 'VISIBLE',
    hiddenAt: null,
    hiddenByUserId: null,
    hiddenReason: null,
    createdAt: new Date('2026-07-07T00:00:00.000Z'),
    updatedAt: new Date('2026-07-07T00:00:00.000Z'),
    author: { id: 'user-1', displayName: 'Audience' },
    ...overrides,
  };
}

function makeRepo(overrides: Partial<ConcertReviewRepositoryPort> = {}): ConcertReviewRepositoryPort {
  return {
    findPublishedConcertBySlug: vi.fn().mockResolvedValue(concert),
    findConcertById: vi.fn().mockResolvedValue(concert),
    hasIssuedTicket: vi.fn().mockResolvedValue(true),
    findByConcertAndUser: vi.fn().mockResolvedValue(null),
    listVisible: vi.fn().mockResolvedValue([review()]),
    getVisibleSummary: vi.fn().mockResolvedValue({ averageRating: 5, reviewCount: 1 }),
    create: vi.fn().mockResolvedValue(review()),
    updateOwn: vi.fn().mockResolvedValue(review({ rating: 4, comment: 'Updated' })),
    deleteOwn: vi.fn().mockResolvedValue(true),
    hide: vi.fn().mockResolvedValue(review({ status: 'HIDDEN' })),
    ...overrides,
  };
}

describe('concert review use cases', () => {
  it('lists only visible reviews with visible-only aggregate from repository', async () => {
    const repo = makeRepo();
    const result = await new ListConcertReviewsUseCase(repo).execute(concert.slug);

    expect(repo.getVisibleSummary).toHaveBeenCalledWith(concert.id);
    expect(repo.listVisible).toHaveBeenCalledWith(concert.id);
    expect(result.summary.reviewCount).toBe(1);
    expect(result.reviews).toHaveLength(1);
  });

  it('rejects create when user does not have an issued ticket', async () => {
    const repo = makeRepo({ hasIssuedTicket: vi.fn().mockResolvedValue(false) });

    await expect(
      new CreateConcertReviewUseCase(repo).execute(concert.slug, 'user-1', {
        rating: 5,
        comment: 'Great',
      }),
    ).rejects.toBeInstanceOf(ConcertReviewMissingIssuedTicketError);
  });

  it('rejects duplicate review before creating', async () => {
    const repo = makeRepo({ findByConcertAndUser: vi.fn().mockResolvedValue(review()) });

    await expect(
      new CreateConcertReviewUseCase(repo).execute(concert.slug, 'user-1', {
        rating: 5,
        comment: 'Great',
      }),
    ).rejects.toBeInstanceOf(ConcertReviewDuplicateError);
  });

  it('validates rating and comment', async () => {
    const repo = makeRepo();

    await expect(
      new CreateConcertReviewUseCase(repo).execute(concert.slug, 'user-1', {
        rating: 6,
        comment: 'Great',
      }),
    ).rejects.toBeInstanceOf(ConcertReviewValidationError);

    await expect(
      new CreateConcertReviewUseCase(repo).execute(concert.slug, 'user-1', {
        rating: 5,
        comment: '',
      }),
    ).rejects.toBeInstanceOf(ConcertReviewValidationError);
  });

  it('updates and deletes only the current user review by concert slug', async () => {
    const repo = makeRepo({ findByConcertAndUser: vi.fn().mockResolvedValue(review()) });

    await new UpdateMyConcertReviewUseCase(repo).execute(concert.slug, 'user-1', {
      rating: 4,
      comment: 'Updated',
    });
    await new DeleteMyConcertReviewUseCase(repo).execute(concert.slug, 'user-1');

    expect(repo.updateOwn).toHaveBeenCalledWith(concert.id, 'user-1', {
      rating: 4,
      comment: 'Updated',
    });
    expect(repo.deleteOwn).toHaveBeenCalledWith(concert.id, 'user-1');
  });

  it('does not allow a hidden review to be made visible by audience update', async () => {
    const repo = makeRepo({
      findByConcertAndUser: vi.fn().mockResolvedValue(review({ status: 'HIDDEN' })),
    });

    await expect(
      new UpdateMyConcertReviewUseCase(repo).execute(concert.slug, 'user-1', {
        rating: 4,
        comment: 'Updated',
      }),
    ).rejects.toBeInstanceOf(ConcertReviewNotFoundError);
    expect(repo.updateOwn).not.toHaveBeenCalled();
  });

  it('throws not found when deleting a missing own review', async () => {
    const repo = makeRepo({ deleteOwn: vi.fn().mockResolvedValue(false) });

    await expect(
      new DeleteMyConcertReviewUseCase(repo).execute(concert.slug, 'user-1'),
    ).rejects.toBeInstanceOf(ConcertReviewNotFoundError);
  });

  it('allows admin hide with normalized reason', async () => {
    const repo = makeRepo();

    await new HideConcertReviewUseCase(repo).execute(concert.id, 'review-1', 'admin-1', ' spam ');

    expect(repo.hide).toHaveBeenCalledWith(concert.id, 'review-1', 'admin-1', 'spam');
  });
});
