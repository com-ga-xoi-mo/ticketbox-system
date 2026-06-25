export class PromoCodeNotFoundError extends Error {
  readonly code = 'PROMO_CODE_NOT_FOUND';
  constructor(message = 'Promo code not found') {
    super(message);
    this.name = 'PromoCodeNotFoundError';
  }
}

export class PromoCodeInactiveError extends Error {
  readonly code = 'PROMO_CODE_INACTIVE';
  constructor(message = 'Promo code is inactive') {
    super(message);
    this.name = 'PromoCodeInactiveError';
  }
}

export class PromoCodeExpiredError extends Error {
  readonly code = 'PROMO_CODE_EXPIRED';
  constructor(message = 'Promo code has expired') {
    super(message);
    this.name = 'PromoCodeExpiredError';
  }
}

export class PromoCodeNotYetValidError extends Error {
  readonly code = 'PROMO_CODE_NOT_YET_VALID';
  constructor(message = 'Promo code is not yet valid') {
    super(message);
    this.name = 'PromoCodeNotYetValidError';
  }
}

export class PromoUsageLimitExceededError extends Error {
  readonly code = 'PROMO_USAGE_LIMIT_EXCEEDED';
  constructor(message = 'Promo code usage limit exceeded') {
    super(message);
    this.name = 'PromoUsageLimitExceededError';
  }
}

export class PromoUserLimitExceededError extends Error {
  readonly code = 'PROMO_USER_LIMIT_EXCEEDED';
  constructor(message = 'Promo code user limit exceeded') {
    super(message);
    this.name = 'PromoUserLimitExceededError';
  }
}

export class PromoNotApplicableError extends Error {
  readonly code = 'PROMO_NOT_APPLICABLE';
  constructor(message = 'Promo code is not applicable to the selected items') {
    super(message);
    this.name = 'PromoNotApplicableError';
  }
}
