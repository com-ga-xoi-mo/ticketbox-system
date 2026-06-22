import type { PosterAsset } from '../poster.types';

export const POSTER_WRITE_REPOSITORY = Symbol('POSTER_WRITE_REPOSITORY');

export interface CreatePosterAssetData {
  id: string;
  storageKey: string;
  publicUrl: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  checksum: string;
  uploadedById: string;
}

export interface PosterWriteRepositoryPort {
  createAssetAndAssociateConcertPoster(
    assetData: CreatePosterAssetData,
    concertId: string,
    oldAssetId?: string,
  ): Promise<{
    asset: PosterAsset;
    concert: { id: string; posterAssetId: string };
    replacedStorageKey: string | null;
  }>;

  findAssetById(id: string): Promise<PosterAsset | null>;
}
