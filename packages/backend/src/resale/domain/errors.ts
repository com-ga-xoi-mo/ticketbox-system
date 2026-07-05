import { HttpException, HttpStatus } from '@nestjs/common';

export class ResaleDomainError extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
    this.name = this.constructor.name;
  }
}

export class ListingNotFoundError extends ResaleDomainError {
  constructor(listingId?: string) {
    super(`Listing ${listingId || ''} not found.`, HttpStatus.NOT_FOUND);
  }
}

export class TicketNotIssuedError extends ResaleDomainError {
  constructor() {
    super('Ticket must be in ISSUED status.');
  }
}

export class NotTicketOwnerError extends ResaleDomainError {
  constructor() {
    super('You are not the owner of this ticket.', HttpStatus.FORBIDDEN);
  }
}

export class EventResaleDisabledError extends ResaleDomainError {
  constructor() {
    super('This event does not allow resale.');
  }
}

export class ResaleCutoffWindowPassedError extends ResaleDomainError {
  constructor() {
    super('Resale cutoff window has passed.');
  }
}

export class PriceExceedsCapError extends ResaleDomainError {
  constructor() {
    super('Price exceeds maximum allowed cap.');
  }
}

export class GuestListResaleNotAllowedError extends ResaleDomainError {
  constructor() {
    super('Guest list tickets cannot be resold.');
  }
}

export class ListingNotActiveError extends ResaleDomainError {
  constructor() {
    super('Listing is not active.');
  }
}

export class SelfPurchaseNotAllowedError extends ResaleDomainError {
  constructor() {
    super('Cannot purchase your own listing.');
  }
}

export class ListingExpiredError extends ResaleDomainError {
  constructor() {
    super('Listing has expired.');
  }
}

export class CommentNotFoundError extends ResaleDomainError {
  constructor() {
    super('Comment not found.', HttpStatus.NOT_FOUND);
  }
}

export class ThreadNotFoundError extends ResaleDomainError {
  constructor() {
    super('Thread not found.', HttpStatus.NOT_FOUND);
  }
}

export class NotParticipantError extends ResaleDomainError {
  constructor() {
    super('You are not a participant in this thread.', HttpStatus.FORBIDDEN);
  }
}

export class ThreadClosedError extends ResaleDomainError {
  constructor() {
    super('Thread is closed.');
  }
}

export class InvalidMessageBodyError extends ResaleDomainError {
  constructor() {
    super('Message body must be 1-1000 characters plain text.');
  }
}

export class SellerCannotInitiateThreadError extends ResaleDomainError {
  constructor() {
    super('Seller cannot initiate thread.');
  }
}

