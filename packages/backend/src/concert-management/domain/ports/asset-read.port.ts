import type { ServableAsset } from '../asset.types';

export const ASSET_READ_REPOSITORY = Symbol('AssetReadRepositoryPort');

export interface AssetReadRepositoryPort {
  findServableAsset(id: string): Promise<ServableAsset | null>;
}
