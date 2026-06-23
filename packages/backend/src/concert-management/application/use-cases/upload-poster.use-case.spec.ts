import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import type { PlatformConfigService } from '../../../platform/config/platform-config.service';
import type { ObjectStoragePort } from '../../../platform/storage';
import type { PosterWriteRepositoryPort } from '../../domain/ports/poster-write.port';
import type { PosterAsset } from '../../domain/poster.types';
import type { PosterImageValidator } from '../services/poster-image-validator';
import { UploadPosterUseCase } from './upload-poster.use-case';

const now = new Date('2026-06-15T00:00:00.000Z');

function makePosterAsset(overrides: Partial<PosterAsset> = {}): PosterAsset {
  return {
    id: 'asset-new',
    kind: 'POSTER',
    status: 'ACTIVE',
    storageKey: 'posters/concert-1/asset-new.jpg',
    publicUrl: 'http://cdn/posters/concert-1/asset-new.jpg',
    originalName: 'poster.jpg',
    contentType: 'image/jpeg',
    sizeBytes: 1024,
    checksum: 'sha256:abc',
    uploadedById: 'user-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// PNG magic bytes (8 bytes)
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_BUFFER = Buffer.concat([PNG_HEADER, Buffer.alloc(100)]);

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    concertId: 'concert-1',
    userId: 'user-1',
    allowAdminOverride: false,
    fileBuffer: PNG_BUFFER,
    originalName: 'poster.png',
    mimeType: 'image/png',
    sizeBytes: PNG_BUFFER.length,
    ...overrides,
  };
}

describe('UploadPosterUseCase', () => {
  let authorizeConcertManagement: AuthorizeConcertManagementUseCase;
  let storage: ObjectStoragePort;
  let posterWriteRepo: PosterWriteRepositoryPort;
  let config: PlatformConfigService;
  let posterImageValidator: PosterImageValidator;

  beforeEach(() => {
    authorizeConcertManagement = {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthorizeConcertManagementUseCase;

    storage = {
      putObject: vi.fn().mockResolvedValue(undefined),
      deleteObject: vi.fn().mockResolvedValue(undefined),
      getObject: vi.fn(),
      objectExists: vi.fn(),
      getPublicUrl: vi.fn().mockImplementation((key: string) => `http://cdn/${key}`),
    };

    posterWriteRepo = {
      createAssetAndAssociateConcertPoster: vi.fn(),
      findAssetById: vi.fn(),
    };

    config = {
      posterImageMaxBytes: 5 * 1024 * 1024,
    } as unknown as PlatformConfigService;

    posterImageValidator = {
      validate: vi.fn().mockReturnValue({ contentType: 'image/png', extension: 'png' }),
    } as unknown as PosterImageValidator;
  });

  function makeUseCase() {
    return new UploadPosterUseCase(
      authorizeConcertManagement,
      storage,
      posterWriteRepo,
      config,
      posterImageValidator,
    );
  }

  it('first upload: calls repository with correct data and returns result without calling deleteObject for old asset', async () => {
    const asset = makePosterAsset();
    const repoResult = {
      asset,
      concert: { id: 'concert-1', posterAssetId: asset.id },
      replacedStorageKey: null,
    };
    vi.mocked(posterWriteRepo.createAssetAndAssociateConcertPoster).mockResolvedValue(repoResult);

    const useCase = makeUseCase();
    const result = await useCase.execute(makeInput());

    expect(result.asset.id).toBe('asset-new');
    expect(result.concert.id).toBe('concert-1');
    expect(storage.getPublicUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^posters\/concert-1\//),
    );
    expect(posterWriteRepo.createAssetAndAssociateConcertPoster).toHaveBeenCalledWith(
      expect.objectContaining({
        publicUrl: expect.stringMatching(/^http:\/\/cdn\/posters\/concert-1\//),
      }),
      'concert-1',
    );
    // deleteObject should only be called for putObject rollback, not for a replaced asset
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it('re-upload: calls storage.deleteObject with the previous asset storageKey after the transaction commits', async () => {
    const asset = makePosterAsset();
    const oldStorageKey = 'posters/concert-1/asset-old.jpg';
    const repoResult = {
      asset,
      concert: { id: 'concert-1', posterAssetId: asset.id },
      replacedStorageKey: oldStorageKey,
    };
    vi.mocked(posterWriteRepo.createAssetAndAssociateConcertPoster).mockResolvedValue(repoResult);

    const useCase = makeUseCase();
    const result = await useCase.execute(makeInput());

    expect(result.asset.id).toBe('asset-new');
    expect(storage.deleteObject).toHaveBeenCalledWith(oldStorageKey);
  });

  it('re-upload: a thrown deleteObject for the old asset does NOT fail the upload (result is still returned)', async () => {
    const asset = makePosterAsset();
    const oldStorageKey = 'posters/concert-1/asset-old.jpg';
    const repoResult = {
      asset,
      concert: { id: 'concert-1', posterAssetId: asset.id },
      replacedStorageKey: oldStorageKey,
    };
    vi.mocked(posterWriteRepo.createAssetAndAssociateConcertPoster).mockResolvedValue(repoResult);
    vi.mocked(storage.deleteObject).mockRejectedValue(new Error('storage unavailable'));

    const useCase = makeUseCase();
    const result = await useCase.execute(makeInput());

    expect(result.asset.id).toBe('asset-new');
    expect(result.concert.id).toBe('concert-1');
  });

  it('repository failure: deletes the newly-uploaded object and re-throws the error', async () => {
    const repoError = new Error('db failure');
    vi.mocked(posterWriteRepo.createAssetAndAssociateConcertPoster).mockRejectedValue(repoError);

    const useCase = makeUseCase();
    await expect(useCase.execute(makeInput())).rejects.toThrow(repoError);
    // The new object (storageKey) should have been cleaned up
    expect(storage.deleteObject).toHaveBeenCalledTimes(1);
    expect(vi.mocked(storage.deleteObject).mock.calls[0][0]).toMatch(/^posters\/concert-1\//);
  });
});
