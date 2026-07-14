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

export const ArtistBioHttpErrorCode = {
  INVALID_PRESS_KIT: 'INVALID_PRESS_KIT',
  ARTIST_BIO_STATUS_TRANSITION: 'ARTIST_BIO_STATUS_TRANSITION',
  ARTIST_BIO_NOT_FOUND: 'ARTIST_BIO_NOT_FOUND',
  CONCERT_NOT_FOUND: 'CONCERT_NOT_FOUND',
  FORBIDDEN_CONCERT_OWNERSHIP: 'FORBIDDEN_CONCERT_OWNERSHIP',
} as const;

function responseBody(statusCode: number, code: string, message: string) {
  return { statusCode, code, message };
}

export async function handleArtistBioHttpErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err: unknown) {
    if (err instanceof InvalidPressKitError) {
      throw new BadRequestException(
        responseBody(400, ArtistBioHttpErrorCode.INVALID_PRESS_KIT, err.message),
      );
    }
    if (err instanceof ForbiddenConcertOwnershipError) {
      throw new ForbiddenException(
        responseBody(403, ArtistBioHttpErrorCode.FORBIDDEN_CONCERT_OWNERSHIP, err.message),
      );
    }
    if (err instanceof ConcertNotFoundError) {
      throw new NotFoundException(
        responseBody(404, ArtistBioHttpErrorCode.CONCERT_NOT_FOUND, err.message),
      );
    }
    if (err instanceof ArtistBioNotFoundError) {
      throw new NotFoundException(
        responseBody(404, ArtistBioHttpErrorCode.ARTIST_BIO_NOT_FOUND, err.message),
      );
    }
    if (err instanceof ArtistBioStatusTransitionError) {
      throw new ConflictException(
        responseBody(409, ArtistBioHttpErrorCode.ARTIST_BIO_STATUS_TRANSITION, err.message),
      );
    }
    throw err;
  }
}
