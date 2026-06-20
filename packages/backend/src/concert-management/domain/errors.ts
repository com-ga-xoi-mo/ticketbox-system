export class PublicConcertNotFoundError extends Error {
  constructor(slug: string) {
    super(`Public concert not found: ${slug}`);
    this.name = 'PublicConcertNotFoundError';
  }
}

export class MissingConcertFieldsError extends Error {
  constructor() {
    super('Missing required concert fields');
    this.name = 'MissingConcertFieldsError';
  }
}

export class InvalidConcertSlugError extends Error {
  constructor(slug: string) {
    super(`Slug must be URL-safe (lowercase alphanumeric and hyphens): ${slug}`);
    this.name = 'InvalidConcertSlugError';
  }
}

export class ConcertSlugAlreadyExistsError extends Error {
  constructor(slug: string) {
    super(`Concert slug already exists: ${slug}`);
    this.name = 'ConcertSlugAlreadyExistsError';
  }
}

export class ConcertNotEditableError extends Error {
  constructor(status: string) {
    super(`Cannot update concert in ${status} status`);
    this.name = 'ConcertNotEditableError';
  }
}

export class InvalidConcertStatusTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot transition concert from ${from} to ${to}`);
    this.name = 'InvalidConcertStatusTransitionError';
  }
}

export class InvalidTicketPriceError extends Error {
  constructor() {
    super('Price must be greater than or equal to 0');
    this.name = 'InvalidTicketPriceError';
  }
}

export class InvalidTicketQuantityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTicketQuantityError';
  }
}

export class InvalidSalePeriodError extends Error {
  constructor() {
    super('Sale end time must be after sale start time');
    this.name = 'InvalidSalePeriodError';
  }
}

export class TicketTypeCodeAlreadyExistsError extends Error {
  constructor(code: string) {
    super(`Ticket type code "${code}" already exists for this concert`);
    this.name = 'TicketTypeCodeAlreadyExistsError';
  }
}

export class TicketTypeNotFoundError extends Error {
  constructor(ticketTypeId: string) {
    super(`Ticket type not found: ${ticketTypeId}`);
    this.name = 'TicketTypeNotFoundError';
  }
}

export class TicketTypeHasSoldTicketsError extends Error {
  constructor() {
    super('Cannot archive a ticket type with sold or reserved tickets');
    this.name = 'TicketTypeHasSoldTicketsError';
  }
}
