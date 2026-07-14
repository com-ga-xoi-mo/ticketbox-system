import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  ConcertNotFoundError,
  ForbiddenConcertOwnershipError,
} from '../../../identity/domain/errors';
import {
  ArtistBioNotFoundError,
  ArtistBioStatusTransitionError,
  InvalidPressKitError,
} from '../../domain/errors';
import { ArtistBioHttpErrorCode, handleArtistBioHttpErrors } from './artist-bio-error.mapper';

describe('artist bio HTTP error mapper', () => {
  it.each([
    [
      new InvalidPressKitError('bad file'),
      BadRequestException,
      400,
      ArtistBioHttpErrorCode.INVALID_PRESS_KIT,
    ],
    [
      new ArtistBioStatusTransitionError('bad transition'),
      ConflictException,
      409,
      ArtistBioHttpErrorCode.ARTIST_BIO_STATUS_TRANSITION,
    ],
    [
      new ArtistBioNotFoundError('bio'),
      NotFoundException,
      404,
      ArtistBioHttpErrorCode.ARTIST_BIO_NOT_FOUND,
    ],
    [
      new ConcertNotFoundError('concert'),
      NotFoundException,
      404,
      ArtistBioHttpErrorCode.CONCERT_NOT_FOUND,
    ],
    [
      new ForbiddenConcertOwnershipError('concert'),
      ForbiddenException,
      403,
      ArtistBioHttpErrorCode.FORBIDDEN_CONCERT_OWNERSHIP,
    ],
  ])('maps %s to a coded envelope', async (error, Exception, statusCode, code) => {
    await expect(
      handleArtistBioHttpErrors(async () => {
        throw error;
      }),
    ).rejects.toBeInstanceOf(Exception);
    try {
      await handleArtistBioHttpErrors(async () => {
        throw error;
      });
    } catch (result) {
      expect((result as { getResponse: () => unknown }).getResponse()).toMatchObject({
        statusCode,
        code,
      });
    }
  });
});
