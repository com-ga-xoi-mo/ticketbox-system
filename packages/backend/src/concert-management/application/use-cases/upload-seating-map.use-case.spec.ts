import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import type { PlatformConfigService } from '../../../platform/config/platform-config.service';
import type { ObjectStoragePort } from '../../../platform/storage';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';
import type { SeatingMapWriteRepositoryPort } from '../../domain/ports/seating-map-write.port';
import { ConcertNotDraftError } from '../../domain/seating-map.errors';
import type { SeatingMapAsset } from '../../domain/seating-map.types';
import type { SvgElementIdExtractor } from '../services/svg-element-id-extractor';
import type { SvgSanitizer } from '../services/svg-sanitizer';
import { UploadSeatingMapUseCase } from './upload-seating-map.use-case';

const now = new Date('2026-06-15T00:00:00.000Z');

function makeSeatingMapAsset(overrides: Partial<SeatingMapAsset> = {}): SeatingMapAsset {
  return {
    id: 'asset-new',
    kind: 'SEATING_MAP',
    status: 'ACTIVE',
    storageKey: 'seating-maps/concert-1/asset-new.svg',
    publicUrl: 'http://cdn/seating-maps/concert-1/asset-new.svg',
    originalName: 'map.svg',
    contentType: 'image/svg+xml',
    sizeBytes: 512,
    checksum: 'sha256:def',
    uploadedById: 'user-1',
    createdAt: now,
    updatedAt: now,
    svgElementIds: [],
    ...overrides,
  };
}

const SVG_BUFFER = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    concertId: 'concert-1',
    userId: 'user-1',
    allowAdminOverride: false,
    fileBuffer: SVG_BUFFER,
    originalName: 'map.svg',
    mimeType: 'image/svg+xml',
    sizeBytes: SVG_BUFFER.length,
    ...overrides,
  };
}

describe('UploadSeatingMapUseCase', () => {
  let authorizeConcertManagement: AuthorizeConcertManagementUseCase;
  let storage: ObjectStoragePort;
  let seatingMapWriteRepo: SeatingMapWriteRepositoryPort;
  let concertWriteRepo: ConcertWriteRepositoryPort;
  let config: PlatformConfigService;
  let svgSanitizer: SvgSanitizer;
  let svgElementIdExtractor: SvgElementIdExtractor;

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

    seatingMapWriteRepo = {
      createAssetAndAssociateConcertSeatingMap: vi.fn(),
      findAssetById: vi.fn(),
    };

    concertWriteRepo = {
      findConcertById: vi.fn().mockResolvedValue({ id: 'concert-1', status: 'DRAFT' }),
    } as unknown as ConcertWriteRepositoryPort;

    config = {
      seatingMapSvgMaxBytes: 5 * 1024 * 1024,
    } as unknown as PlatformConfigService;

    svgSanitizer = {
      sanitize: vi.fn().mockReturnValue({ sanitizedBuffer: SVG_BUFFER, removedElements: [] }),
    } as unknown as SvgSanitizer;

    svgElementIdExtractor = {
      extract: vi.fn().mockReturnValue(['zone-1', 'zone-2']),
    } as unknown as SvgElementIdExtractor;
  });

  function makeUseCase() {
    return new UploadSeatingMapUseCase(
      authorizeConcertManagement,
      storage,
      seatingMapWriteRepo,
      concertWriteRepo,
      config,
      svgSanitizer,
      svgElementIdExtractor,
    );
  }

  it('first upload: calls repository with correct data and returns result without calling deleteObject for old asset', async () => {
    const asset = makeSeatingMapAsset();
    const repoResult = {
      asset,
      concert: { id: 'concert-1', seatingMapAssetId: asset.id },
      replacedStorageKey: null,
    };
    vi.mocked(seatingMapWriteRepo.createAssetAndAssociateConcertSeatingMap).mockResolvedValue(
      repoResult,
    );

    const useCase = makeUseCase();
    const result = await useCase.execute(makeInput());

    expect(result.asset.id).toBe('asset-new');
    expect(result.concert.id).toBe('concert-1');
    expect(storage.getPublicUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^seating-maps\/concert-1\//),
    );
    expect(seatingMapWriteRepo.createAssetAndAssociateConcertSeatingMap).toHaveBeenCalledWith(
      expect.objectContaining({
        publicUrl: expect.stringMatching(/^http:\/\/cdn\/seating-maps\/concert-1\//),
      }),
      'concert-1',
    );
    // deleteObject should only be called for putObject rollback, not for a replaced asset
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it('re-upload: calls storage.deleteObject with the previous asset storageKey after the transaction commits', async () => {
    const asset = makeSeatingMapAsset();
    const oldStorageKey = 'seating-maps/concert-1/asset-old.svg';
    const repoResult = {
      asset,
      concert: { id: 'concert-1', seatingMapAssetId: asset.id },
      replacedStorageKey: oldStorageKey,
    };
    vi.mocked(seatingMapWriteRepo.createAssetAndAssociateConcertSeatingMap).mockResolvedValue(
      repoResult,
    );

    const useCase = makeUseCase();
    const result = await useCase.execute(makeInput());

    expect(result.asset.id).toBe('asset-new');
    expect(storage.deleteObject).toHaveBeenCalledWith(oldStorageKey);
  });

  it('re-upload: a thrown deleteObject for the old asset does NOT fail the upload (result is still returned)', async () => {
    const asset = makeSeatingMapAsset();
    const oldStorageKey = 'seating-maps/concert-1/asset-old.svg';
    const repoResult = {
      asset,
      concert: { id: 'concert-1', seatingMapAssetId: asset.id },
      replacedStorageKey: oldStorageKey,
    };
    vi.mocked(seatingMapWriteRepo.createAssetAndAssociateConcertSeatingMap).mockResolvedValue(
      repoResult,
    );
    vi.mocked(storage.deleteObject).mockRejectedValue(new Error('storage unavailable'));

    const useCase = makeUseCase();
    const result = await useCase.execute(makeInput());

    expect(result.asset.id).toBe('asset-new');
    expect(result.concert.id).toBe('concert-1');
  });

  it('repository failure: deletes the newly-uploaded object and re-throws the error', async () => {
    const repoError = new Error('db failure');
    vi.mocked(seatingMapWriteRepo.createAssetAndAssociateConcertSeatingMap).mockRejectedValue(
      repoError,
    );

    const useCase = makeUseCase();
    await expect(useCase.execute(makeInput())).rejects.toThrow(repoError);
    // The new object (storageKey) should have been cleaned up
    expect(storage.deleteObject).toHaveBeenCalledTimes(1);
    expect(vi.mocked(storage.deleteObject).mock.calls[0][0]).toMatch(/^seating-maps\/concert-1\//);
  });

  it('fails if concert is not in DRAFT status', async () => {
    vi.mocked(concertWriteRepo.findConcertById).mockResolvedValue({ id: 'concert-1', status: 'PUBLISHED' } as any);

    const useCase = makeUseCase();
    await expect(useCase.execute(makeInput())).rejects.toThrow(ConcertNotDraftError);
  });

  it('fails if concert is not found', async () => {
    vi.mocked(concertWriteRepo.findConcertById).mockResolvedValue(null);

    const useCase = makeUseCase();
    await expect(useCase.execute(makeInput())).rejects.toThrow(ConcertNotDraftError);
  });

  it('sanitizes SVG, extracts element IDs, and uses sanitized buffer for checksum, size, and storage', async () => {
    const sanitizedBuffer = Buffer.from('<svg id="sanitized"></svg>');
    vi.mocked(svgSanitizer.sanitize).mockReturnValue({
      sanitizedBuffer: sanitizedBuffer,
      removedElements: ['script'],
    });
    vi.mocked(svgElementIdExtractor.extract).mockReturnValue(['zone-A']);

    const repoResult = {
      asset: makeSeatingMapAsset(),
      concert: { id: 'concert-1', seatingMapAssetId: 'asset-new' },
      replacedStorageKey: null,
    };
    vi.mocked(seatingMapWriteRepo.createAssetAndAssociateConcertSeatingMap).mockResolvedValue(repoResult);

    const useCase = makeUseCase();
    const result = await useCase.execute(makeInput());

    expect(svgSanitizer.sanitize).toHaveBeenCalledWith(SVG_BUFFER);
    expect(svgElementIdExtractor.extract).toHaveBeenCalledWith(sanitizedBuffer.toString('utf-8'));
    
    // Checks that the storage object put used the sanitized buffer
    expect(storage.putObject).toHaveBeenCalledWith(expect.objectContaining({
      content: sanitizedBuffer,
    }));

    // Checks that the repository was called with the right size and metadata
    expect(seatingMapWriteRepo.createAssetAndAssociateConcertSeatingMap).toHaveBeenCalledWith(
      expect.objectContaining({
        sizeBytes: sanitizedBuffer.length,
        metadata: { svgElementIds: ['zone-A'] },
      }),
      'concert-1'
    );

    // Checks result contains removedElements and extracted IDs
    expect(result.removedElements).toEqual(['script']);
    expect(result.extractedSvgElementIds).toEqual(['zone-A']);
  });
});
