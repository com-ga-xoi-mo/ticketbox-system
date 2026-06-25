export class AudienceResourceNotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
  }
}

export class RefundRequestIneligibleError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class DuplicateRefundRequestError extends Error {
  constructor(readonly existingRequestId: string) {
    super('An active refund request already exists for this resource');
  }
}

export class TicketResendUnavailableError extends Error {
  constructor(message: string) {
    super(message);
  }
}
