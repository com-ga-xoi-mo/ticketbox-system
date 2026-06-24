import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import {
  ConcertNotFoundError,
  ForbiddenConcertOwnershipError,
} from '../../../identity/domain/errors';
import {
  ConcertNotDraftError,
  CrossConcertZoneMappingError,
  DuplicateSvgElementIdError,
  InvalidSeatingMapContentTypeError,
  InvalidSeatingMapExtensionError,
  InvalidSvgElementIdError,
  MissingSeatingMapFileError,
  SeatingMapFileTooLargeError,
  SeatingMapRequiredError,
  UnsafeSeatingMapSvgError,
} from '../../domain/seating-map.errors';

export async function mapSeatingMapErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err: unknown) {
    if (err instanceof ForbiddenConcertOwnershipError) {
      throw new ForbiddenException(err.message);
    }
    if (err instanceof ConcertNotFoundError) {
      throw new NotFoundException(err.message);
    }
    if (
      err instanceof MissingSeatingMapFileError ||
      err instanceof InvalidSeatingMapContentTypeError ||
      err instanceof InvalidSeatingMapExtensionError ||
      err instanceof SeatingMapFileTooLargeError ||
      err instanceof UnsafeSeatingMapSvgError ||
      err instanceof DuplicateSvgElementIdError ||
      err instanceof CrossConcertZoneMappingError ||
      err instanceof SeatingMapRequiredError ||
      err instanceof InvalidSvgElementIdError ||
      err instanceof ConcertNotDraftError
    ) {
      throw new BadRequestException(err.message);
    }
    throw err;
  }
}
