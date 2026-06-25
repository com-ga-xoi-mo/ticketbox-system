import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import {
  ConcertNotFoundError,
  ForbiddenConcertOwnershipError,
} from '../../../identity/domain/errors';
import {
  ConcertNotEditableError,
  ConcertSlugAlreadyExistsError,
  InvalidConcertSlugError,
  InvalidConcertStatusTransitionError,
  InvalidSalePeriodError,
  InvalidTicketPriceError,
  InvalidTicketQuantityError,
  MissingConcertFieldsError,
  TicketTypeCodeAlreadyExistsError,
  TicketTypeHasSoldTicketsError,
  TicketTypeNotFoundError,
} from '../../domain/errors';

export async function mapConcertErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err: unknown) {
    console.error('ConcertErrorMapper caught error:', err);
    if (err instanceof ForbiddenConcertOwnershipError) {
      throw new ForbiddenException(err.message);
    }
    if (err instanceof ConcertNotFoundError) {
      throw new NotFoundException(err.message);
    }
    if (err instanceof TicketTypeNotFoundError) {
      throw new NotFoundException(err.message);
    }
    if (
      err instanceof MissingConcertFieldsError ||
      err instanceof InvalidConcertSlugError ||
      err instanceof ConcertNotEditableError ||
      err instanceof InvalidConcertStatusTransitionError ||
      err instanceof InvalidTicketPriceError ||
      err instanceof InvalidTicketQuantityError ||
      err instanceof InvalidSalePeriodError ||
      err instanceof TicketTypeHasSoldTicketsError
    ) {
      throw new BadRequestException(err.message);
    }
    if (
      err instanceof ConcertSlugAlreadyExistsError ||
      err instanceof TicketTypeCodeAlreadyExistsError
    ) {
      throw new ConflictException(err.message);
    }
    throw err;
  }
}
