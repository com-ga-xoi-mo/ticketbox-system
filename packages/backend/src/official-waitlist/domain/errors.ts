export class WaitlistTicketTypeNotFoundError extends Error {
  constructor(public readonly ticketTypeId: string) {
    super(`Ticket type not found for official waitlist: ${ticketTypeId}`);
    this.name = 'WaitlistTicketTypeNotFoundError';
  }
}

export class WaitlistTicketTypeNotEligibleError extends Error {
  constructor(public readonly ticketTypeId: string) {
    super(`Ticket type is not eligible for official waitlist: ${ticketTypeId}`);
    this.name = 'WaitlistTicketTypeNotEligibleError';
  }
}

export class WaitlistDuplicateEntryError extends Error {
  constructor(public readonly entryId: string) {
    super(`Active official waitlist entry already exists: ${entryId}`);
    this.name = 'WaitlistDuplicateEntryError';
  }
}

export class WaitlistEntryNotFoundError extends Error {
  constructor(public readonly ticketTypeId: string) {
    super(`Official waitlist entry not found for ticket type: ${ticketTypeId}`);
    this.name = 'WaitlistEntryNotFoundError';
  }
}

export class WaitlistQuantityExceededError extends Error {
  constructor(
    public readonly requestedQuantity: number,
    public readonly maxQuantity: number,
  ) {
    super(
      `Official waitlist requested quantity exceeds allowed quantity: requested=${requestedQuantity}, max=${maxQuantity}`,
    );
    this.name = 'WaitlistQuantityExceededError';
  }
}
