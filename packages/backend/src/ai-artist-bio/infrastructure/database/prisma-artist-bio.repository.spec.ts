import { AssetKind, AssetStatus, ArtistBioStatus as PrismaArtistBioStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../../platform/database/prisma.service';
import { PrismaArtistBioRepository } from './prisma-artist-bio.repository';

const baseArtistBio = {
  id: 'artist-bio-1',
  concertId: 'concert-1',
  pressKitAssetId: 'asset-1',
  requestedById: 'organizer-1',
  reviewedById: null,
  status: PrismaArtistBioStatus.DRAFT,
  sourceText: null,
  generatedBio: null,
  publishedBio: null,
  provider: null,
  errorMessage: null,
  retryCount: 0,
  maxAttempts: 3,
  lastAttemptedAt: null,
  nextRetryAt: null,
  publishedAt: null,
  createdAt: new Date('2026-06-18T07:00:00.000Z'),
  updatedAt: new Date('2026-06-18T07:00:00.000Z'),
  pressKitAsset: null,
};

function repositoryWith(prisma: Partial<PrismaService>) {
  return new PrismaArtistBioRepository(prisma as PrismaService);
}

describe('PrismaArtistBioRepository', () => {
  it('stores press kits as active PRESS_KIT assets with artist_bios workflow metadata', async () => {
    const assetCreate = vi.fn(async ({ data }) => ({
      id: 'asset-1',
      storageKey: data.storageKey,
      originalName: data.originalName,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
      checksum: data.checksum,
    }));
    const repository = repositoryWith({
      asset: { create: assetCreate } as never,
    });

    await repository.createPressKitAsset({
      storageKey: 'artist-bio/concert-1/checksum.pdf',
      originalName: 'press-kit.pdf',
      contentType: 'application/pdf',
      sizeBytes: 100,
      checksum: 'checksum',
      uploadedById: 'organizer-1',
    });

    expect(assetCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: AssetKind.PRESS_KIT,
        status: AssetStatus.ACTIVE,
        metadata: { workflowTable: 'artist_bios' },
      }),
    });
  });

  it('creates artist_bios as the durable workflow source of truth with transient queue metadata only', async () => {
    const artistBioCreate = vi.fn(async ({ data }) => ({
      ...baseArtistBio,
      ...data,
      pressKitAsset: null,
    }));
    const repository = repositoryWith({
      artistBio: { create: artistBioCreate } as never,
    });

    await repository.createWorkflow({
      concertId: 'concert-1',
      pressKitAssetId: 'asset-1',
      requestedById: 'organizer-1',
      maxAttempts: 3,
    });

    expect(artistBioCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: PrismaArtistBioStatus.DRAFT,
        retryCount: 0,
        maxAttempts: 3,
        metadata: {
          sourceOfTruth: 'artist_bios',
          queueJob: 'artist_bio.requested',
        },
      }),
      include: { pressKitAsset: true },
    });
  });

  it('persists processing, failure, retry, and publication lifecycle fields on artist_bios', async () => {
    const update = vi.fn(async ({ data }) => ({
      ...baseArtistBio,
      ...data,
      status: data.status,
      retryCount: data.retryCount?.increment ?? baseArtistBio.retryCount,
      pressKitAsset: null,
    }));
    const findUniqueOrThrow = vi.fn(async () => ({
      ...baseArtistBio,
      generatedBio: 'Approved biography',
    }));
    const repository = repositoryWith({
      artistBio: { update, findUniqueOrThrow } as never,
    });

    await repository.markProcessing({
      artistBioId: 'artist-bio-1',
      attemptedAt: new Date('2026-06-18T07:00:00.000Z'),
    });
    await repository.markFailed({
      artistBioId: 'artist-bio-1',
      errorMessage: 'Provider unavailable',
    });
    await repository.resetFailedForRetry('artist-bio-1');
    await repository.publish({
      artistBioId: 'artist-bio-1',
      reviewedById: 'organizer-1',
      publishedAt: new Date('2026-06-18T08:00:00.000Z'),
    });

    expect(update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          status: PrismaArtistBioStatus.PROCESSING,
          retryCount: { increment: 1 },
          errorMessage: null,
        }),
      }),
    );
    expect(update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          status: PrismaArtistBioStatus.FAILED,
          errorMessage: 'Provider unavailable',
        }),
      }),
    );
    expect(update).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        data: expect.objectContaining({
          status: PrismaArtistBioStatus.DRAFT,
          errorMessage: null,
        }),
      }),
    );
    expect(update).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        data: expect.objectContaining({
          status: PrismaArtistBioStatus.PUBLISHED,
          publishedBio: 'Approved biography',
          reviewedById: 'organizer-1',
        }),
      }),
    );
  });
});
