import { cleanExtractedPdfText } from '../text-cleanup';
import { ArtistBioNotFoundError, ArtistBioProcessingError } from '../../domain/errors';
import { ArtistBioStatus, type ArtistBioJobResult } from '../../domain/artist-bio.types';
import type { AiBioGeneratorPort } from '../../domain/ports/ai-bio-generator.port';
import type { ArtistBioRepositoryPort } from '../../domain/ports/artist-bio-repository.port';
import type { ObjectStoragePort } from '../../domain/ports/object-storage.port';
import type { PdfTextExtractorPort } from '../../domain/ports/pdf-text-extractor.port';

export class ProcessArtistBioUseCase {
  constructor(
    private readonly repository: ArtistBioRepositoryPort,
    private readonly storage: ObjectStoragePort,
    private readonly extractor: PdfTextExtractorPort,
    private readonly generator: AiBioGeneratorPort,
    private readonly inputMaxChars: number,
  ) {}

  async execute(artistBioId: string): Promise<ArtistBioJobResult> {
    const artistBio = await this.repository.findById(artistBioId);
    if (!artistBio) {
      throw new ArtistBioNotFoundError(artistBioId);
    }
    if (!artistBio.pressKitAsset?.storageKey) {
      throw new ArtistBioProcessingError('Artist bio job has no press kit asset.');
    }
    if (artistBio.status === ArtistBioStatus.PUBLISHED) {
      return { artistBioId, status: ArtistBioStatus.PUBLISHED };
    }

    const processing = await this.repository.markProcessing({
      artistBioId,
      attemptedAt: new Date(),
    });

    try {
      const pdf = await this.storage.getObject(artistBio.pressKitAsset.storageKey);
      const rawText = await this.extractor.extractText(pdf);
      const sourceText = cleanExtractedPdfText(rawText, this.inputMaxChars);
      const generated = await this.generator.generateBio(sourceText);

      const ready = await this.repository.markReady({
        artistBioId,
        sourceText,
        generatedBio: generated.bio,
        provider: generated.provider,
      });

      return {
        artistBioId: ready.id,
        status: ready.status,
        provider: ready.provider ?? generated.provider,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Artist bio processing failed.';
      const failed = await this.repository.markFailed({
        artistBioId,
        errorMessage: message,
        nextRetryAt: this.nextRetryAt(processing.retryCount, processing.maxAttempts),
      });
      return { artistBioId: failed.id, status: failed.status };
    }
  }

  private nextRetryAt(retryCount: number, maxAttempts: number): Date | null {
    if (retryCount >= maxAttempts) {
      return null;
    }

    const backoffMinutes = Math.min(2 ** Math.max(retryCount - 1, 0), 15);
    return new Date(Date.now() + backoffMinutes * 60_000);
  }
}
