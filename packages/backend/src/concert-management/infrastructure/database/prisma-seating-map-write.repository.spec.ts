import { AssetKind, AssetStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../../platform/database/prisma.service';
import { PrismaSeatingMapWriteRepository } from './prisma-seating-map-write.repository';

const now = new Date('2026-06-15T00:00:00.000Z');

function makeAssetRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'asset-new',
    kind: AssetKind.SEATING_MAP,
    status: AssetStatus.ACTIVE,
    storageKey: 'seating-maps/concert-1/asset-new.svg',
    publicUrl: 'http://cdn/seating-maps/concert-1/asset-new.svg',
    originalName: 'map.svg',
    contentType: 'image/svg+xml',
    sizeBytes: 512,
    checksum: 'sha256:def',
    uploadedById: 'user-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeAssetData(assetId = 'asset-new') {
  return {
    id: assetId,
    storageKey: `seating-maps/concert-1/${assetId}.svg`,
    publicUrl: `http://cdn/seating-maps/concert-1/${assetId}.svg`,
    originalName: 'map.svg',
    contentType: 'image/svg+xml',
    sizeBytes: 512,
    checksum: 'sha256:def',
    uploadedById: 'user-1',
  };
}

function createRepository(txAsset: unknown, txConcert: unknown): PrismaSeatingMapWriteRepository {
  const tx = { asset: txAsset, concert: txConcert };
  return new PrismaSeatingMapWriteRepository({
    $transaction: vi.fn().mockImplementation((cb: (tx: unknown) => unknown) => cb(tx)),
  } as unknown as PrismaService);
}

describe('PrismaSeatingMapWriteRepository', () => {
  describe('createAssetAndAssociateConcertSeatingMap', () => {
    it('first upload: creates asset, updates concert, and returns replacedStorageKey null when there is no previous asset', async () => {
      const newAsset = makeAssetRow();
      const txAsset = {
        create: vi.fn().mockResolvedValue(newAsset),
        findUnique: vi.fn(),
        delete: vi.fn(),
      };
      const txConcert = {
        findUnique: vi.fn().mockResolvedValue({ id: 'concert-1', seatingMapAssetId: null }),
        update: vi.fn().mockResolvedValue({ id: 'concert-1', seatingMapAssetId: newAsset.id }),
      };
      const repo = createRepository(txAsset, txConcert);

      const result = await repo.createAssetAndAssociateConcertSeatingMap(
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
      const oldStorageKey = 'seating-maps/concert-1/asset-old.svg';
      const txAsset = {
        create: vi.fn().mockResolvedValue(newAsset),
        findUnique: vi.fn().mockResolvedValue({ storageKey: oldStorageKey }),
        delete: vi.fn().mockResolvedValue(undefined),
      };
      const txConcert = {
        findUnique: vi.fn().mockResolvedValue({ id: 'concert-1', seatingMapAssetId: 'asset-old' }),
        update: vi.fn().mockResolvedValue({ id: 'concert-1', seatingMapAssetId: 'asset-new' }),
      };
      const repo = createRepository(txAsset, txConcert);

      const result = await repo.createAssetAndAssociateConcertSeatingMap(
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
        findUnique: vi
          .fn()
          .mockResolvedValue({ storageKey: 'seating-maps/concert-1/asset-old.svg' }),
        delete: vi.fn().mockResolvedValue(undefined),
        updateMany: vi.fn(),
      };
      const txConcert = {
        findUnique: vi.fn().mockResolvedValue({ id: 'concert-1', seatingMapAssetId: 'asset-old' }),
        update: vi.fn().mockResolvedValue({ id: 'concert-1', seatingMapAssetId: 'asset-new' }),
      };
      const repo = createRepository(txAsset, txConcert);

      await repo.createAssetAndAssociateConcertSeatingMap(makeAssetData('asset-new'), 'concert-1');

      expect(txAsset.updateMany).not.toHaveBeenCalled();
    });
  });
});
