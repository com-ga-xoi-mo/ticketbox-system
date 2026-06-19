import { describe, expect, it, vi } from 'vitest';

import { ForbiddenConcertOwnershipError } from '../../../../identity/domain/errors';
import type { AuthorizeConcertManagementUseCase } from '../../../../identity/application/use-cases/authorize-concert-management.use-case';
import type { PlatformConfigService } from '../../../../platform/config/platform-config.service';
import type { ObjectStoragePort } from '../../../../platform/storage';
import type { SeatingMapWriteRepositoryPort } from '../../../domain/ports/seating-map-write.port';
import {
  InvalidSeatingMapContentTypeError,
  MissingSeatingMapFileError,
  SeatingMapFileTooLargeError,
  UnsafeSeatingMapSvgError,
} from '../../../domain/seating-map.errors';
import type { SeatingMapAsset } from '../../../domain/seating-map.types';
import { SvgSafetyValidator } from '../../services/svg-safety-validator';
import { UploadSeatingMapUseCase } from '../upload-seating-map.use-case';

function createUseCase() {
  const storedObjects = new Map<string, Buffer>();
  const assets: SeatingMapAsset[] = [];
  let currentAssetId: string | undefined;
  const authorize = {
    execute: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuthorizeConcertManagementUseCase;
  const storage: ObjectStoragePort = {
    putObject: vi.fn(async ({ key, content }) => {
      storedObjects.set(key, content);
    }),
    getObject: vi.fn(async (key) => storedObjects.get(key) ?? Buffer.alloc(0)),
    deleteObject: vi.fn(async (key) => {
      storedObjects.delete(key);
    }),
    objectExists: vi.fn(async (key) => storedObjects.has(key)),
    getPublicUrl: vi.fn((key) => `http://localhost:3000/storage/${key}`),
  };
  const repo: SeatingMapWriteRepositoryPort = {
    createAssetAndAssociateConcertSeatingMap: vi.fn(async (data, concertId) => {
      if (currentAssetId) {
        const oldAsset = assets.find((asset) => asset.id === currentAssetId);
        if (oldAsset) oldAsset.status = 'ARCHIVED';
      }
      const now = new Date();
      const asset: SeatingMapAsset = {
        ...data,
        kind: 'SEATING_MAP',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      };
      assets.push(asset);
      currentAssetId = asset.id;
      return { asset, concert: { id: concertId, seatingMapAssetId: asset.id } };
    }),
    findAssetById: vi.fn(async (id) => assets.find((asset) => asset.id === id) ?? null),
  };
  const config = { seatingMapSvgMaxBytes: 100 } as PlatformConfigService;
  const useCase = new UploadSeatingMapUseCase(
    authorize,
    storage,
    repo,
    config,
    new SvgSafetyValidator(),
  );

  return { assets, authorize, repo, storage, storedObjects, useCase };
}

function validInput(overrides = {}) {
  const fileBuffer = Buffer.from('<svg><path d="M0 0"/></svg>');
  return {
    concertId: 'concert-1',
    userId: 'user-1',
    allowAdminOverride: false,
    fileBuffer,
    originalName: 'map.svg',
    mimeType: 'image/svg+xml',
    sizeBytes: fileBuffer.length,
    ...overrides,
  };
}

describe('UploadSeatingMapUseCase', () => {
  it('stores a valid SVG and returns asset metadata with publicUrl and checksum', async () => {
    const { storage, useCase } = createUseCase();

    const result = await useCase.execute(validInput());

    expect(result.asset.kind).toBe('SEATING_MAP');
    expect(result.asset.storageKey).toMatch(/^seating-maps\/concert-1\/.+\.svg$/);
    expect(result.asset.publicUrl).toBe(`http://localhost:3000/storage/${result.asset.storageKey}`);
    expect(result.asset.checksum).toMatch(/^sha256:/);
    expect(storage.putObject).toHaveBeenCalledWith({
      key: result.asset.storageKey,
      content: validInput().fileBuffer,
      contentType: 'image/svg+xml',
    });
  });

  it('rejects unsafe SVG before storage', async () => {
    const { storage, useCase } = createUseCase();

    await expect(
      useCase.execute(validInput({ fileBuffer: Buffer.from('<svg><script></script></svg>') })),
    ).rejects.toThrow(UnsafeSeatingMapSvgError);
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('rejects empty, non-SVG, and oversized files', async () => {
    const { useCase } = createUseCase();

    await expect(
      useCase.execute(validInput({ fileBuffer: Buffer.alloc(0), sizeBytes: 0 })),
    ).rejects.toThrow(MissingSeatingMapFileError);
    await expect(useCase.execute(validInput({ mimeType: 'text/plain' }))).rejects.toThrow(
      InvalidSeatingMapContentTypeError,
    );
    await expect(
      useCase.execute(validInput({ fileBuffer: Buffer.alloc(101), sizeBytes: 101 })),
    ).rejects.toThrow(SeatingMapFileTooLargeError);
  });

  it('uses organizer authorization and propagates forbidden errors', async () => {
    const { authorize, useCase } = createUseCase();
    vi.mocked(authorize.execute).mockRejectedValue(new ForbiddenConcertOwnershipError('concert-1'));

    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenConcertOwnershipError);
  });

  it('allows admin override authorization', async () => {
    const { authorize, useCase } = createUseCase();

    await useCase.execute(validInput({ allowAdminOverride: true, userId: 'admin-1' }));

    expect(authorize.execute).toHaveBeenCalledWith({
      actor: { userId: 'admin-1', roles: ['ADMIN'] },
      concertId: 'concert-1',
      allowAdminOverride: true,
    });
  });

  it('re-upload archives the old asset and generates a unique storage key', async () => {
    const { assets, useCase } = createUseCase();

    const first = await useCase.execute(validInput());
    const second = await useCase.execute(validInput());

    expect(first.asset.id).not.toBe(second.asset.id);
    expect(first.asset.storageKey).not.toBe(second.asset.storageKey);
    expect(assets.find((asset) => asset.id === first.asset.id)?.status).toBe('ARCHIVED');
    expect(assets.find((asset) => asset.id === second.asset.id)?.status).toBe('ACTIVE');
  });
});
