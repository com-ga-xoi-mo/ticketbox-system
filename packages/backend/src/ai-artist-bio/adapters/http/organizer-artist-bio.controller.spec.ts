import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { ForbiddenConcertOwnershipError } from '../../../identity/domain/errors';
import { Role } from '../../../identity/domain/role.enum';
import { ArtistBioStatus } from '../../domain/artist-bio.types';
import { OrganizerArtistBioController } from './organizer-artist-bio.controller';

const user = { id: 'organizer-1', roles: [Role.ORGANIZER] };
const baseRecord = {
  id: 'artist-bio-1',
  concertId: 'concert-1',
  pressKitAssetId: 'asset-1',
  pressKitAsset: null,
  requestedById: 'organizer-1',
  reviewedById: null,
  status: ArtistBioStatus.READY_FOR_REVIEW,
  sourceText: 'source',
  generatedBio: 'generated',
  publishedBio: null,
  provider: 'local-deterministic',
  errorMessage: null,
  retryCount: 1,
  maxAttempts: 3,
  lastAttemptedAt: null,
  nextRetryAt: null,
  publishedAt: null,
  createdAt: new Date('2026-06-18T07:00:00.000Z'),
  updatedAt: new Date('2026-06-18T07:00:00.000Z'),
};

describe('OrganizerArtistBioController', () => {
  it('uploads base64 PDF payloads and returns created job status', async () => {
    const requestArtistBio = {
      execute: vi.fn(async () => baseRecord),
    };
    const controller = new OrganizerArtistBioController(
      requestArtistBio as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const response = await controller.upload(
      'concert-1',
      {
        originalName: 'artist-profile.pdf',
        contentType: 'application/pdf',
        contentBase64: Buffer.from('%PDF-1.4 demo').toString('base64'),
      },
      { user },
    );

    expect(requestArtistBio.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        concertId: 'concert-1',
        actor: { userId: 'organizer-1', roles: [Role.ORGANIZER] },
        allowAdminOverride: false,
        upload: expect.objectContaining({
          originalName: 'artist-profile.pdf',
          contentType: 'application/pdf',
          content: expect.any(Uint8Array),
        }),
      }),
    );
    expect(response).toMatchObject({
      id: 'artist-bio-1',
      status: ArtistBioStatus.READY_FOR_REVIEW,
      generatedBio: 'generated',
    });
  });

  it('maps non-owner authorization failures to HTTP forbidden errors', async () => {
    const requestArtistBio = {
      execute: vi.fn(async () => {
        throw new ForbiddenConcertOwnershipError('concert-1');
      }),
    };
    const controller = new OrganizerArtistBioController(
      requestArtistBio as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      controller.upload(
        'concert-1',
        {
          originalName: 'artist-profile.pdf',
          contentType: 'application/pdf',
          contentBase64: Buffer.from('%PDF-1.4 demo').toString('base64'),
        },
        { user },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
