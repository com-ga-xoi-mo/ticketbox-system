import { AssetKind, AssetStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../../platform/database/prisma.service';
import { PrismaPosterWriteRepository } from './prisma-poster-write.repository';

const now = new Date('2026-06-15T00:00:00.000Z');

function makeAssetRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'asset-new',
    kind: AssetKind.POSTER,
    status: AssetStatus.ACTIVE,
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

function makeAssetData(assetId = 'asset-new') {
  return {
    id: assetId,
    storageKey: `posters/concert-1/${assetId}.jpg`,
    publicUrl: `http://cdn/posters/concert-1/${assetId}.jpg`,
    originalName: 'poster.jpg',
    contentType: 'image/jpeg',
    sizeBytes: 1024,
    checksum: 'sha256:abc',
    uploadedById: 'user-1',
  };
}

function createRepository(txAsset: unknown, txConcert: unknown): PrismaPosterWriteRepository {
  const tx = { asset: txAsset, concert: txConcert };
  return new PrismaPosterWriteRepository({
    $transaction: vi.fn().mockImplementation((cb: (tx: unknown) => unknown) => cb(tx)),
  } as unknown as PrismaService);
}

describe('PrismaPosterWriteRepository', () => {
  describe('createAssetAndAssociateConcertPoster', () => {
    it('first upload: creates asset, updates concert, and returns replacedStorageKey null when there is no previous asset', async () => {
      const newAsset = makeAssetRow();
      const txAsset = {
        create: vi.fn().mockResolvedValue(newAsset),
        findUnique: vi.fn(),
        delete: vi.fn(),
      };
      const txConcert = {
        findUnique: vi.fn().mockResolvedValue({ id: 'concert-1', posterAssetId: null }),
        update: vi.fn().mockResolvedValue({ id: 'concert-1', posterAssetId: newAsset.id }),
      };
      const repo = createRepository(txAsset, txConcert);

      const result = await repo.createAssetAndAssociateConcertPoster(
        makeAssetData(),
        'concert-1',
      );

      expect(result.replacedStorageKey).toBeNull();
      expect(txAsset.delete).not.toHaveBeenCalled();
      expect(result.asset.id).toBe('asset-new');
      expect(result.concert.id).toBe('concert-1');
    });

    it('re-upload: deletes the previous Asset row inside the transaction and returns its storageKey', async () => {
      const newAsset = makeAssetRow({ id: 'asset-new' });
      const oldStorageKey = 'posters/concert-1/asset-old.jpg';
      const txAsset = {
        create: vi.fn().mockResolvedValue(newAsset),
        findUnique: vi.fn().mockResolvedValue({ storageKey: oldStorageKey }),
        delete: vi.fn().mockResolvedValue(undefined),
      };
      const txConcert = {
        findUnique: vi.fn().mockResolvedValue({ id: 'concert-1', posterAssetId: 'asset-old' }),
        update: vi.fn().mockResolvedValue({ id: 'concert-1', posterAssetId: 'asset-new' }),
      };
      const repo = createRepository(txAsset, txConcert);

      const result = await repo.createAssetAndAssociateConcertPoster(
        makeAssetData('asset-new'),
        'concert-1',
      );

      expect(result.replacedStorageKey).toBe(oldStorageKey);
      expect(txAsset.findUnique).toHaveBeenCalledWith({
        where: { id: 'asset-old' },
        select: { storageKey: true },
      });
      expect(txAsset.delete).toHaveBeenCalledWith({ where: { id: 'asset-old' } });
    });

    it('re-upload: does not call updateMany with ARCHIVED status', async () => {
      const newAsset = makeAssetRow({ id: 'asset-new' });
      const txAsset = {
        create: vi.fn().mockResolvedValue(newAsset),
        findUnique: vi.fn().mockResolvedValue({ storageKey: 'posters/concert-1/asset-old.jpg' }),
        delete: vi.fn().mockResolvedValue(undefined),
        updateMany: vi.fn(),
      };
      const txConcert = {
        findUnique: vi.fn().mockResolvedValue({ id: 'concert-1', posterAssetId: 'asset-old' }),
        update: vi.fn().mockResolvedValue({ id: 'concert-1', posterAssetId: 'asset-new' }),
      };
      const repo = createRepository(txAsset, txConcert);

      await repo.createAssetAndAssociateConcertPoster(makeAssetData('asset-new'), 'concert-1');

      expect(txAsset.updateMany).not.toHaveBeenCalled();
    });
  });
});
