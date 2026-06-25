export interface PosterAsset {
  id: string;
  kind: string;
  status: string;
  storageKey: string;
  publicUrl: string | null;
  originalName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  checksum: string | null;
  uploadedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadPosterInput {
  concertId: string;
  userId: string;
  allowAdminOverride: boolean;
  fileBuffer: Buffer;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface UploadPosterResult {
  asset: PosterAsset;
  concert: {
    id: string;
    posterAssetId: string;
  };
}
