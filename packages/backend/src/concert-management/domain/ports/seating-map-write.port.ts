import type { SeatingMapAsset } from '../seating-map.types';

export const SEATING_MAP_WRITE_REPOSITORY = Symbol('SEATING_MAP_WRITE_REPOSITORY');

export interface CreateSeatingMapAssetData {
  id: string;
  storageKey: string;
  publicUrl: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  checksum: string;
  uploadedById: string;
}

export interface SeatingMapWriteRepositoryPort {
  createAssetAndAssociateConcertSeatingMap(
    assetData: CreateSeatingMapAssetData,
    concertId: string,
    oldAssetId?: string,
  ): Promise<{
    asset: SeatingMapAsset;
    concert: { id: string; seatingMapAssetId: string };
    replacedStorageKey: string | null;
  }>;

  findAssetById(id: string): Promise<SeatingMapAsset | null>;
}
