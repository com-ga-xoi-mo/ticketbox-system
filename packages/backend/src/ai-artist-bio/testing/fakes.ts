import type {
  ArtistBioAssetRecord,
  ArtistBioRecord,
  GeneratedArtistBio,
} from '../domain/artist-bio.types';
import { ArtistBioStatus } from '../domain/artist-bio.types';
import type {
  CreateArtistBioWorkflowInput,
  CreatePressKitAssetInput,
  MarkArtistBioFailedInput,
  MarkArtistBioProcessingInput,
  MarkArtistBioReadyInput,
  PublishArtistBioInput,
  ArtistBioRepositoryPort,
} from '../domain/ports/artist-bio-repository.port';
import type { AiBioGeneratorPort } from '../domain/ports/ai-bio-generator.port';
import type { ArtistBioQueuePort } from '../domain/ports/artist-bio-queue.port';
import {
  InMemoryObjectStorageAdapter,
  type ObjectStoragePort,
  type PutObjectInput,
} from '../../platform/storage';
import type { PdfTextExtractorPort } from '../domain/ports/pdf-text-extractor.port';

const now = () => new Date('2026-06-18T07:00:00.000Z');

export class InMemoryArtistBioRepository implements ArtistBioRepositoryPort {
  assets = new Map<string, ArtistBioAssetRecord>();
  records = new Map<string, ArtistBioRecord>();
  assetSequence = 1;
  recordSequence = 1;

  async createPressKitAsset(input: CreatePressKitAssetInput): Promise<ArtistBioAssetRecord> {
    const asset: ArtistBioAssetRecord = {
      id: `asset-${this.assetSequence++}`,
      storageKey: input.storageKey,
      originalName: input.originalName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      checksum: input.checksum,
    };
    this.assets.set(asset.id, asset);
    return asset;
  }

  async createWorkflow(input: CreateArtistBioWorkflowInput): Promise<ArtistBioRecord> {
    const record = this.record({
      id: `artist-bio-${this.recordSequence++}`,
      concertId: input.concertId,
      pressKitAssetId: input.pressKitAssetId,
      pressKitAsset: this.assets.get(input.pressKitAssetId) ?? null,
      requestedById: input.requestedById,
      maxAttempts: input.maxAttempts,
    });
    this.records.set(record.id, record);
    return record;
  }

  async findById(artistBioId: string): Promise<ArtistBioRecord | null> {
    return this.records.get(artistBioId) ?? null;
  }

  async findLatestForConcert(concertId: string): Promise<ArtistBioRecord | null> {
    return [...this.records.values()].find((record) => record.concertId === concertId) ?? null;
  }

  async markProcessing(input: MarkArtistBioProcessingInput): Promise<ArtistBioRecord> {
    return this.update(input.artistBioId, {
      status: ArtistBioStatus.PROCESSING,
      retryCount: (await this.required(input.artistBioId)).retryCount + 1,
      lastAttemptedAt: input.attemptedAt,
      errorMessage: null,
      nextRetryAt: null,
    });
  }

  async markReady(input: MarkArtistBioReadyInput): Promise<ArtistBioRecord> {
    return this.update(input.artistBioId, {
      status: ArtistBioStatus.READY_FOR_REVIEW,
      sourceText: input.sourceText,
      generatedBio: input.generatedBio,
      provider: input.provider,
      errorMessage: null,
      nextRetryAt: null,
    });
  }

  async markFailed(input: MarkArtistBioFailedInput): Promise<ArtistBioRecord> {
    return this.update(input.artistBioId, {
      status: ArtistBioStatus.FAILED,
      errorMessage: input.errorMessage,
      provider: input.provider ?? (await this.required(input.artistBioId)).provider,
      nextRetryAt: input.nextRetryAt ?? null,
    });
  }

  async resetFailedForRetry(artistBioId: string): Promise<ArtistBioRecord> {
    return this.update(artistBioId, {
      status: ArtistBioStatus.DRAFT,
      errorMessage: null,
      nextRetryAt: null,
    });
  }

  async publish(input: PublishArtistBioInput): Promise<ArtistBioRecord> {
    const existing = await this.required(input.artistBioId);
    return this.update(input.artistBioId, {
      status: ArtistBioStatus.PUBLISHED,
      publishedBio: existing.generatedBio,
      reviewedById: input.reviewedById,
      publishedAt: input.publishedAt,
    });
  }

  async updateStatus(artistBioId: string, status: ArtistBioStatus): Promise<ArtistBioRecord> {
    return this.update(artistBioId, { status });
  }

  record(overrides: Partial<ArtistBioRecord> = {}): ArtistBioRecord {
    const createdAt = now();
    return {
      id: 'artist-bio-1',
      concertId: 'concert-1',
      pressKitAssetId: null,
      pressKitAsset: null,
      requestedById: 'organizer-1',
      reviewedById: null,
      status: ArtistBioStatus.DRAFT,
      sourceText: null,
      generatedBio: null,
      publishedBio: null,
      provider: null,
      errorMessage: null,
      retryCount: 0,
      maxAttempts: 3,
      lastAttemptedAt: null,
      nextRetryAt: null,
      publishedAt: null,
      createdAt,
      updatedAt: createdAt,
      ...overrides,
    };
  }

  private async required(id: string): Promise<ArtistBioRecord> {
    const record = this.records.get(id);
    if (!record) throw new Error(`Missing artist bio ${id}`);
    return record;
  }

  private async update(id: string, patch: Partial<ArtistBioRecord>): Promise<ArtistBioRecord> {
    const existing = await this.required(id);
    const next = { ...existing, ...patch, updatedAt: now() };
    this.records.set(id, next);
    return next;
  }
}

export class InMemoryObjectStorage extends InMemoryObjectStorageAdapter implements ObjectStoragePort {
  failPut = false;

  override async putObject(input: PutObjectInput): Promise<void> {
    if (this.failPut) throw new Error('Object storage unavailable');
    await super.putObject(input);
  }
}

export class InMemoryArtistBioQueue implements ArtistBioQueuePort {
  enqueued: string[] = [];

  async enqueueRequested(artistBioId: string): Promise<void> {
    this.enqueued.push(artistBioId);
  }
}

export class StaticPdfTextExtractor implements PdfTextExtractorPort {
  constructor(private readonly text: string) {}

  async extractText(): Promise<string> {
    return this.text;
  }
}

export class StaticAiBioGenerator implements AiBioGeneratorPort {
  constructor(private readonly result: GeneratedArtistBio | Error) {}

  async generateBio(): Promise<GeneratedArtistBio> {
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}
