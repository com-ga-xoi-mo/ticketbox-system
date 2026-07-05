export class ResaleDomainError extends Error {
  constructor(public message: string, public code: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ListingNotFoundError extends ResaleDomainError {
  constructor(listingId?: string) {
    super(`Listing ${listingId || ''} not found.`, 'LISTING_NOT_FOUND');
  }
}

export class TicketNotIssuedError extends ResaleDomainError {
  constructor() {
    super('Ticket must be in ISSUED status.', 'TICKET_NOT_ISSUED');
  }
}

export class NotTicketOwnerError extends ResaleDomainError {
  constructor() {
    super('You are not the owner of this ticket.', 'NOT_TICKET_OWNER');
  }
}

export class EventResaleDisabledError extends ResaleDomainError {
  constructor() {
    super('This event does not allow resale.', 'EVENT_RESALE_DISABLED');
  }
}

export class ResaleCutoffWindowPassedError extends ResaleDomainError {
  constructor() {
    super('Resale cutoff window has passed.', 'RESALE_CUTOFF_PASSED');
  }
}

export class PriceExceedsCapError extends ResaleDomainError {
  constructor() {
    super('Price exceeds maximum allowed cap.', 'PRICE_EXCEEDS_CAP');
  }
}

export class GuestListResaleNotAllowedError extends ResaleDomainError {
  constructor() {
    super('Guest list tickets cannot be resold.', 'GUEST_LIST_RESALE_NOT_ALLOWED');
  }
}

export class ListingNotActiveError extends ResaleDomainError {
  constructor() {
    super('Listing is not active.', 'LISTING_NOT_ACTIVE');
  }
}

export class SelfPurchaseNotAllowedError extends ResaleDomainError {
  constructor() {
    super('Cannot purchase your own listing.', 'SELF_PURCHASE_NOT_ALLOWED');
  }
}

export class ListingExpiredError extends ResaleDomainError {
  constructor() {
    super('Listing has expired.', 'LISTING_EXPIRED');
  }
}

export class CommentNotFoundError extends ResaleDomainError {
  constructor() {
    super('Comment not found.', 'COMMENT_NOT_FOUND');
  }
}

export class ThreadNotFoundError extends ResaleDomainError {
  constructor() {
    super('Thread not found.', 'THREAD_NOT_FOUND');
  }
}

export class NotParticipantError extends ResaleDomainError {
  constructor() {
    super('You are not a participant in this thread.', 'NOT_PARTICIPANT');
  }
}

export class ThreadClosedError extends ResaleDomainError {
  constructor() {
    super('Thread is closed.', 'THREAD_CLOSED');
  }
}

export class InvalidMessageBodyError extends ResaleDomainError {
  constructor() {
    super('Message body must be 1-1000 characters plain text.', 'INVALID_MESSAGE_BODY');
  }
}

export class SellerCannotInitiateThreadError extends ResaleDomainError {
  constructor() {
    super('Seller cannot initiate thread.', 'SELLER_CANNOT_INITIATE_THREAD');
  }
}

export class OrderNotFoundError extends ResaleDomainError {
  constructor() {
    super('Order not found.', 'ORDER_NOT_FOUND');
  }
}

export class NotOrderParticipantError extends ResaleDomainError {
  constructor() {
    super('Not order participant.', 'NOT_ORDER_PARTICIPANT');
  }
}

export class NotOrderSellerError extends ResaleDomainError {
  constructor() {
    super('Not order seller.', 'NOT_ORDER_SELLER');
  }
}

export class CannotCancelAfterPaymentConfirmedError extends ResaleDomainError {
  constructor() {
    super('Cannot cancel after payment confirmed.', 'CANNOT_CANCEL_AFTER_PAYMENT_CONFIRMED');
  }
}

export class CannotCancelInCurrentStateError extends ResaleDomainError {
  constructor() {
    super('Cannot cancel in current state.', 'CANNOT_CANCEL_IN_CURRENT_STATE');
  }
}

export class InvalidOrderStateError extends ResaleDomainError {
  constructor() {
    super('Invalid order state.', 'INVALID_ORDER_STATE');
  }
}

export class BuyerSuspendedError extends ResaleDomainError {
  constructor() {
    super('Tài khoản của bạn đã bị khóa tính năng mua lại vé.', 'BUYER_SUSPENDED');
  }
}

export class SellerBankInfoMissingError extends ResaleDomainError {
  constructor() {
    super('Người bán chưa cung cấp thông tin tài khoản nhận tiền.', 'SELLER_BANK_INFO_MISSING');
  }
}

export class ListingNotAvailableError extends ResaleDomainError {
  constructor() {
    super('Vé này đã được mua hoặc đang có người giữ chỗ.', 'LISTING_NOT_AVAILABLE');
  }
}

export class PaymentProofRequiredError extends ResaleDomainError {
  constructor() {
    super('Payment proof required.', 'PAYMENT_PROOF_REQUIRED');
  }
}

export class NotOrderBuyerError extends ResaleDomainError {
  constructor() {
    super('Not order buyer.', 'NOT_ORDER_BUYER');
  }
}

