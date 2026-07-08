export class LotteryTicketTypeNotFoundError extends Error {
  constructor(public readonly ticketTypeId: string) {
    super(`Ticket type not found for presale lottery: ${ticketTypeId}`);
    this.name = 'LotteryTicketTypeNotFoundError';
  }
}

export class LotteryNotConfiguredError extends Error {
  constructor(public readonly ticketTypeId: string) {
    super(`No presale lottery configured for ticket type: ${ticketTypeId}`);
    this.name = 'LotteryNotConfiguredError';
  }
}

export class LotteryConfigInvalidError extends Error {
  constructor(public readonly reason: string) {
    super(`Invalid presale lottery configuration: ${reason}`);
    this.name = 'LotteryConfigInvalidError';
  }
}

export class LotteryAllocationExceedsInventoryError extends Error {
  constructor(
    public readonly allocation: number,
    public readonly available: number,
  ) {
    super(
      `Presale lottery allocation exceeds available inventory: allocation=${allocation}, available=${available}`,
    );
    this.name = 'LotteryAllocationExceedsInventoryError';
  }
}

export class LotteryRegistrationWindowClosedError extends Error {
  constructor(public readonly ticketTypeId: string) {
    super(`Presale lottery registration window is not open for ticket type: ${ticketTypeId}`);
    this.name = 'LotteryRegistrationWindowClosedError';
  }
}

export class LotteryQuantityExceededError extends Error {
  constructor(
    public readonly requestedQuantity: number,
    public readonly maxQuantity: number,
  ) {
    super(
      `Presale lottery requested quantity exceeds allowed quantity: requested=${requestedQuantity}, max=${maxQuantity}`,
    );
    this.name = 'LotteryQuantityExceededError';
  }
}

export class LotteryRegistrationNotFoundError extends Error {
  constructor(public readonly ticketTypeId: string) {
    super(`Presale lottery registration not found for ticket type: ${ticketTypeId}`);
    this.name = 'LotteryRegistrationNotFoundError';
  }
}

export class LotteryAlreadyDrawnError extends Error {
  constructor(public readonly ticketTypeId: string) {
    super(`Presale lottery already drawn for ticket type: ${ticketTypeId}`);
    this.name = 'LotteryAlreadyDrawnError';
  }
}
