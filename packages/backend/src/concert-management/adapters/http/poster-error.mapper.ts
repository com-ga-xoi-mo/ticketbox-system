import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import {
  ConcertNotFoundError,
  ForbiddenConcertOwnershipError,
} from '../../../identity/domain/errors';
import {
  InvalidPosterContentTypeError,
  InvalidPosterExtensionError,
  InvalidPosterMagicBytesError,
  MissingPosterFileError,
  PosterFileTooLargeError,
} from '../../domain/poster.errors';

export async function mapPosterErrors<T>(operation: () => Promise<T>): Promise<T> {
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
      err instanceof MissingPosterFileError ||
      err instanceof InvalidPosterContentTypeError ||
      err instanceof InvalidPosterExtensionError ||
      err instanceof InvalidPosterMagicBytesError ||
      err instanceof PosterFileTooLargeError
    ) {
      throw new BadRequestException(err.message);
    }
    throw err;
  }
}
