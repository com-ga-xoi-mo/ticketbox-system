import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import {
  ConcertReviewConcertNotFoundError,
  ConcertReviewDuplicateError,
  ConcertReviewMissingIssuedTicketError,
  ConcertReviewNotFoundError,
  ConcertReviewOwnershipError,
  ConcertReviewValidationError,
} from '../../domain/concert-review.errors';

export function mapConcertReviewError(err: unknown): never {
  if (err instanceof ConcertReviewValidationError) {
    throw new BadRequestException(err.message);
  }
  if (err instanceof ConcertReviewConcertNotFoundError || err instanceof ConcertReviewNotFoundError) {
    throw new NotFoundException(err.message);
  }
  if (err instanceof ConcertReviewMissingIssuedTicketError || err instanceof ConcertReviewOwnershipError) {
    throw new ForbiddenException(err.message);
  }
  if (err instanceof ConcertReviewDuplicateError) {
    throw new ConflictException(err.message);
  }
  throw err;
}
