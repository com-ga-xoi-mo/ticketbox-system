import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { ARTIST_BIO_QUEUE_NAME } from '../../../platform/queue/platform-queue.constants';
import { ProcessArtistBioUseCase } from '../../application/use-cases/process-artist-bio.use-case';
import type { ArtistBioRequestedJobData } from './artist-bio-job.types';

@Processor(ARTIST_BIO_QUEUE_NAME)
export class ArtistBioProcessor extends WorkerHost {
  constructor(private readonly processArtistBio: ProcessArtistBioUseCase) {
    super();
  }

  async process(job: Job<ArtistBioRequestedJobData>): Promise<{ status: string }> {
    const result = await this.processArtistBio.execute(job.data.artistBioId);
    return { status: result.status };
  }
}

