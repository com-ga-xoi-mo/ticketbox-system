import type {
  ArtistBioAssetRecord,
  ArtistBioRecord,
  ArtistBioStatus,
} from '../artist-bio.types';

export const ARTIST_BIO_REPOSITORY = Symbol('ArtistBioRepositoryPort');

export interface CreatePressKitAssetInput {
  storageKey: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  checksum: string;
  uploadedById: string;
}

export interface CreateArtistBioWorkflowInput {
  concertId: string;
  pressKitAssetId: string;
  requestedById: string;
  maxAttempts: number;
}

export interface MarkArtistBioProcessingInput {
  artistBioId: string;
  attemptedAt: Date;
}

export interface MarkArtistBioReadyInput {
  artistBioId: string;
  sourceText: string;
  generatedBio: string;
  provider: string;
}

export interface MarkArtistBioFailedInput {
  artistBioId: string;
  errorMessage: string;
  provider?: string | null;
  nextRetryAt?: Date | null;
}

export interface PublishArtistBioInput {
  artistBioId: string;
  reviewedById: string;
  publishedAt: Date;
}

export interface ArtistBioRepositoryPort {
  createPressKitAsset(input: CreatePressKitAssetInput): Promise<ArtistBioAssetRecord>;
  createWorkflow(input: CreateArtistBioWorkflowInput): Promise<ArtistBioRecord>;
  findById(artistBioId: string): Promise<ArtistBioRecord | null>;
  findLatestForConcert(concertId: string): Promise<ArtistBioRecord | null>;
  markProcessing(input: MarkArtistBioProcessingInput): Promise<ArtistBioRecord>;
  markReady(input: MarkArtistBioReadyInput): Promise<ArtistBioRecord>;
  markFailed(input: MarkArtistBioFailedInput): Promise<ArtistBioRecord>;
  resetFailedForRetry(artistBioId: string): Promise<ArtistBioRecord>;
  publish(input: PublishArtistBioInput): Promise<ArtistBioRecord>;
  updateStatus(artistBioId: string, status: ArtistBioStatus): Promise<ArtistBioRecord>;
}

