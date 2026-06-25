import { Inject, Injectable } from '@nestjs/common';
import { AssetNotServableError } from '../../domain/asset.errors';
import { ASSET_READ_REPOSITORY, type AssetReadRepositoryPort } from '../../domain/ports/asset-read.port';
import { OBJECT_STORAGE, type ObjectStoragePort } from '../../../platform/storage/object-storage.port';
import { StorageObjectNotFoundError } from '../../../platform/storage/storage.errors';
import type { AssetContent } from '../../domain/asset.types';

@Injectable()
export class GetAssetContentUseCase {
  constructor(
    @Inject(ASSET_READ_REPOSITORY)
    private readonly assetReadRepository: AssetReadRepositoryPort,
    @Inject(OBJECT_STORAGE)
    private readonly objectStorage: ObjectStoragePort,
  ) {}

  async execute(assetId: string): Promise<AssetContent> {
    const asset = await this.assetReadRepository.findServableAsset(assetId);

    if (!asset) {
      throw new AssetNotServableError(assetId, 'Asset not found');
    }

    if (asset.status === 'ARCHIVED') {
      throw new AssetNotServableError(assetId, 'Asset is archived');
    }

    if (asset.kind !== 'POSTER' && asset.kind !== 'SEATING_MAP' && asset.kind !== 'ARTIST_AVATAR' && asset.kind !== 'ARTIST_POSTER') {
      throw new AssetNotServableError(assetId, 'Asset kind is not servable');
    }

    try {
      const content = await this.objectStorage.getObject(asset.storageKey);

      return {
        content,
        contentType: asset.contentType || 'application/octet-stream',
      };
    } catch (error) {
      if (error instanceof StorageObjectNotFoundError) {
        throw new AssetNotServableError(assetId, 'Object not found in storage');
      }
      throw error;
    }
  }
}
