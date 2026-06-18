import { describe, expect, it } from 'vitest';

import { ArtistBioStatus } from '../../domain/artist-bio.types';
import {
  InMemoryArtistBioRepository,
  InMemoryObjectStorage,
  StaticAiBioGenerator,
  StaticPdfTextExtractor,
} from '../../testing/fakes';
import { ProcessArtistBioUseCase } from './process-artist-bio.use-case';

function createReadyRepository() {
  const repository = new InMemoryArtistBioRepository();
  const asset = {
    id: 'asset-1',
    storageKey: 'artist-bio/concert-1/demo.pdf',
    originalName: 'artist-profile.pdf',
    contentType: 'application/pdf',
    sizeBytes: 100,
    checksum: 'checksum-1',
  };
  repository.assets.set(asset.id, asset);
  repository.records.set(
    'artist-bio-1',
    repository.record({
      id: 'artist-bio-1',
      pressKitAssetId: asset.id,
      pressKitAsset: asset,
    }),
  );
  const storage = new InMemoryObjectStorage();
  storage.objects.set(asset.storageKey, Buffer.from('%PDF-1.4 demo'));
  return { repository, storage };
}

describe('ProcessArtistBioUseCase', () => {
  it('extracts PDF text, cleans it, generates a deterministic bio, and marks the job ready for review', async () => {
    const { repository, storage } = createReadyRepository();
    const useCase = new ProcessArtistBioUseCase(
      repository,
      storage,
      new StaticPdfTextExtractor('  Artist   profile\nwith   milestones. More details.  '),
      new StaticAiBioGenerator({
        provider: 'local-deterministic',
        bio: 'Generated public biography',
      }),
      100,
    );

    const result = await useCase.execute('artist-bio-1');
    const record = await repository.findById('artist-bio-1');

    expect(result).toMatchObject({
      artistBioId: 'artist-bio-1',
      status: ArtistBioStatus.READY_FOR_REVIEW,
      provider: 'local-deterministic',
    });
    expect(record).toMatchObject({
      status: ArtistBioStatus.READY_FOR_REVIEW,
      retryCount: 1,
      sourceText: 'Artist profile with milestones. More details.',
      generatedBio: 'Generated public biography',
      provider: 'local-deterministic',
      errorMessage: null,
    });
  });

  it('marks the job failed when PDF extraction produces no usable text', async () => {
    const { repository, storage } = createReadyRepository();
    const useCase = new ProcessArtistBioUseCase(
      repository,
      storage,
      new StaticPdfTextExtractor('   \n\t   '),
      new StaticAiBioGenerator({ provider: 'local-deterministic', bio: 'unused' }),
      100,
    );

    const result = await useCase.execute('artist-bio-1');
    const record = await repository.findById('artist-bio-1');

    expect(result.status).toBe(ArtistBioStatus.FAILED);
    expect(record).toMatchObject({
      status: ArtistBioStatus.FAILED,
      retryCount: 1,
      errorMessage: 'The PDF did not contain usable text.',
    });
  });

  it('persists provider errors as failed retryable workflow state', async () => {
    const { repository, storage } = createReadyRepository();
    const useCase = new ProcessArtistBioUseCase(
      repository,
      storage,
      new StaticPdfTextExtractor('Artist profile with usable text.'),
      new StaticAiBioGenerator(new Error('Provider unavailable')),
      100,
    );

    await expect(useCase.execute('artist-bio-1')).resolves.toMatchObject({
      status: ArtistBioStatus.FAILED,
    });
    await expect(repository.findById('artist-bio-1')).resolves.toMatchObject({
      status: ArtistBioStatus.FAILED,
      errorMessage: 'Provider unavailable',
      retryCount: 1,
    });
    const record = await repository.findById('artist-bio-1');
    expect(record?.nextRetryAt).toBeInstanceOf(Date);
    expect(record!.nextRetryAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it('does not schedule another retry after attempts are exhausted', async () => {
    const { repository, storage } = createReadyRepository();
    repository.records.set(
      'artist-bio-1',
      repository.record({
        ...repository.records.get('artist-bio-1')!,
        retryCount: 2,
        maxAttempts: 3,
      }),
    );
    const useCase = new ProcessArtistBioUseCase(
      repository,
      storage,
      new StaticPdfTextExtractor('Artist profile with usable text.'),
      new StaticAiBioGenerator(new Error('Provider unavailable')),
      100,
    );

    await useCase.execute('artist-bio-1');
    await expect(repository.findById('artist-bio-1')).resolves.toMatchObject({
      status: ArtistBioStatus.FAILED,
      retryCount: 3,
      maxAttempts: 3,
      nextRetryAt: null,
    });
  });
});
