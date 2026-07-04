import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { Role } from '../../../identity/domain/role.enum';
import type { PlatformConfigService } from '../../../platform/config/platform-config.service';
import type { ObjectStoragePort } from '../../../platform/storage';
import type { PosterWriteRepositoryPort } from '../../domain/ports/poster-write.port';
import type { PosterAsset } from '../../domain/poster.types';
import type { PosterImageValidator } from '../services/poster-image-validator';
import { UploadBannerUseCase } from './upload-banner.use-case';

const now = new Date('2026-06-15T00:00:00.000Z');

function makeBannerAsset(overrides: Partial<PosterAsset> = {}): PosterAsset {
  return {
    id: 'asset-new',
    kind: 'POSTER',
    status: 'ACTIVE',
    storageKey: 'banners/concert-1/asset-new.png',
    publicUrl: 'http://cdn/banners/concert-1/asset-new.png',
    originalName: 'banner.png',
    contentType: 'image/png',
    sizeBytes: 1024,
    checksum: 'sha256:abc',
    uploadedById: 'user-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_BUFFER = Buffer.concat([PNG_HEADER, Buffer.alloc(100)]);

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    concertId: 'concert-1',
    userId: 'user-1',
    allowAdminOverride: false,
    fileBuffer: PNG_BUFFER,
    originalName: 'banner.png',
    mimeType: 'image/png',
    sizeBytes: PNG_BUFFER.length,
    ...overrides,
  };
}

describe('UploadBannerUseCase', () => {
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
      createAssetAndAssociateConcertBanner: vi.fn(),
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
    return new UploadBannerUseCase(
      authorizeConcertManagement,
      storage,
      posterWriteRepo,
      config,
      posterImageValidator,
    );
  }

  function mockRepoSuccess(replacedStorageKey: string | null = null) {
    const asset = makeBannerAsset();
    vi.mocked(posterWriteRepo.createAssetAndAssociateConcertBanner).mockResolvedValue({
      asset,
      concert: { id: 'concert-1', bannerAssetId: asset.id },
      replacedStorageKey,
    } as never);
    return asset;
  }

  it('first upload: stores under a banner-scoped key, associates bannerAssetId, and returns the public URL', async () => {
    mockRepoSuccess();

    const result = await makeUseCase().execute(makeInput());

    expect(storage.getPublicUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^banners\/concert-1\//),
    );
    expect(storage.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(/^banners\/concert-1\//),
        contentType: 'image/png',
      }),
    );
    expect(posterWriteRepo.createAssetAndAssociateConcertBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        publicUrl: expect.stringMatching(/^http:\/\/cdn\/banners\/concert-1\//),
        uploadedById: 'user-1',
      }),
      'concert-1',
    );
    expect(result.asset.publicUrl).toMatch(/^http:\/\/cdn\/banners\/concert-1\//);
    expect(result.concert).toEqual({ id: 'concert-1', posterAssetId: 'asset-new' });
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it('enforces organizer ownership (no admin override) before touching storage', async () => {
    vi.mocked(authorizeConcertManagement.execute).mockRejectedValue(new Error('forbidden'));

    await expect(makeUseCase().execute(makeInput())).rejects.toThrow('forbidden');
    expect(authorizeConcertManagement.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        allowAdminOverride: false,
        actor: expect.objectContaining({ roles: [Role.ORGANIZER] }),
      }),
    );
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(posterWriteRepo.createAssetAndAssociateConcertBanner).not.toHaveBeenCalled();
  });

  it('admin override authorizes as ADMIN with override enabled', async () => {
    mockRepoSuccess();

    await makeUseCase().execute(makeInput({ allowAdminOverride: true }));

    expect(authorizeConcertManagement.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        allowAdminOverride: true,
        actor: expect.objectContaining({ roles: [Role.ADMIN] }),
      }),
    );
  });

  it('rejects an invalid image signature/type/size before any storage write', async () => {
    vi.mocked(posterImageValidator.validate).mockImplementation(() => {
      throw new Error('Unsupported image type');
    });

    await expect(makeUseCase().execute(makeInput())).rejects.toThrow('Unsupported image type');
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(posterWriteRepo.createAssetAndAssociateConcertBanner).not.toHaveBeenCalled();
  });

  it('replacement: hard-deletes the previous banner object only after the transaction commits', async () => {
    const oldKey = 'banners/concert-1/asset-old.png';
    mockRepoSuccess(oldKey);

    await makeUseCase().execute(makeInput());

    expect(storage.deleteObject).toHaveBeenCalledWith(oldKey);
  });

  it('replacement cleanup failure does not fail the committed upload', async () => {
    mockRepoSuccess('banners/concert-1/asset-old.png');
    vi.mocked(storage.deleteObject).mockRejectedValue(new Error('storage unavailable'));

    const result = await makeUseCase().execute(makeInput());

    expect(result.asset.id).toBe('asset-new');
  });

  it('compensates the newly-uploaded object when the DB association fails', async () => {
    const repoError = new Error('db failure');
    vi.mocked(posterWriteRepo.createAssetAndAssociateConcertBanner).mockRejectedValue(repoError);

    await expect(makeUseCase().execute(makeInput())).rejects.toThrow(repoError);
    expect(storage.deleteObject).toHaveBeenCalledTimes(1);
    expect(vi.mocked(storage.deleteObject).mock.calls[0][0]).toMatch(/^banners\/concert-1\//);
  });
});
