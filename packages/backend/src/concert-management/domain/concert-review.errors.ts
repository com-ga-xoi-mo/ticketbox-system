export class ConcertReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConcertReviewValidationError';
  }
}

export class ConcertReviewConcertNotFoundError extends Error {
  constructor() {
    super('Concert not found');
    this.name = 'ConcertReviewConcertNotFoundError';
  }
}

export class ConcertReviewMissingIssuedTicketError extends Error {
  constructor() {
    super('User must have an issued ticket for this concert before reviewing');
    this.name = 'ConcertReviewMissingIssuedTicketError';
  }
}

export class ConcertReviewDuplicateError extends Error {
  constructor() {
    super('User has already reviewed this concert');
    this.name = 'ConcertReviewDuplicateError';
  }
}

export class ConcertReviewNotFoundError extends Error {
  constructor() {
    super('Review not found');
    this.name = 'ConcertReviewNotFoundError';
  }
}

export class ConcertReviewOwnershipError extends Error {
  constructor() {
    super('User can only update or delete their own review');
    this.name = 'ConcertReviewOwnershipError';
  }
}
