import { describe, expect, it, vi } from 'vitest';

import { ArtistBioStatus } from '../../domain/artist-bio.types';
import { ArtistBioProcessor } from './artist-bio.processor';

describe('ArtistBioProcessor', () => {
  it('runs the artist bio processing use case from the transient queue job payload', async () => {
    const processArtistBio = {
      execute: vi.fn(async () => ({
        artistBioId: 'artist-bio-1',
        status: ArtistBioStatus.READY_FOR_REVIEW,
      })),
    };
    const processor = new ArtistBioProcessor(processArtistBio as never);

    const result = await processor.process({
      data: { artistBioId: 'artist-bio-1' },
    } as never);

    expect(processArtistBio.execute).toHaveBeenCalledWith('artist-bio-1');
    expect(result).toEqual({ status: ArtistBioStatus.READY_FOR_REVIEW });
  });
});
