import type { Role } from '../../identity/domain/role.enum';

export enum ArtistBioStatus {
  DRAFT = 'DRAFT',
  PROCESSING = 'PROCESSING',
  READY_FOR_REVIEW = 'READY_FOR_REVIEW',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
}

export interface ArtistBioActor {
  userId: string;
  roles: Role[];
}

export interface PressKitUpload {
  originalName: string;
  contentType: string;
  content: Buffer;
}

export interface ArtistBioAssetRecord {
  id: string;
  storageKey: string;
  originalName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  checksum: string | null;
}

export interface ArtistBioRecord {
  id: string;
  concertId: string;
  pressKitAssetId: string | null;
  requestedById: string | null;
  reviewedById: string | null;
  status: ArtistBioStatus;
  sourceText: string | null;
  generatedBio: string | null;
  publishedBio: string | null;
  provider: string | null;
  errorMessage: string | null;
  retryCount: number;
  maxAttempts: number;
  lastAttemptedAt: Date | null;
  nextRetryAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  pressKitAsset?: ArtistBioAssetRecord | null;
}

export interface ArtistBioJobResult {
  artistBioId: string;
  status: ArtistBioStatus;
  provider?: string;
}

export interface GeneratedArtistBio {
  provider: string;
  bio: string;
}
