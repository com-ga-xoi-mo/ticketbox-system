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
  ArtistBioNotFoundError,
  ArtistBioStatusTransitionError,
  InvalidPressKitError,
} from '../../domain/errors';

export async function handleArtistBioHttpErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err: unknown) {
    if (err instanceof InvalidPressKitError) {
      throw new BadRequestException(err.message);
    }
    if (err instanceof ForbiddenConcertOwnershipError) {
      throw new ForbiddenException(err.message);
    }
    if (err instanceof ConcertNotFoundError || err instanceof ArtistBioNotFoundError) {
      throw new NotFoundException(err.message);
    }
    if (err instanceof ArtistBioStatusTransitionError) {
      throw new ConflictException(err.message);
    }
    throw err;
  }
}
