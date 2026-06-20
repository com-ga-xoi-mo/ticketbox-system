import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import {
  ARTIST_BIO_REQUESTED_JOB,
  ARTIST_BIO_QUEUE_NAME,
} from '../../../platform/queue/platform-queue.constants';
import type { ArtistBioQueuePort } from '../../domain/ports/artist-bio-queue.port';
import type { ArtistBioRequestedJobData } from './artist-bio-job.types';

@Injectable()
export class ArtistBioProducer implements ArtistBioQueuePort {
  constructor(
    @InjectQueue(ARTIST_BIO_QUEUE_NAME)
    private readonly queue: Queue<ArtistBioRequestedJobData>,
  ) {}

  async enqueueRequested(artistBioId: string): Promise<void> {
    await this.queue.add(
      ARTIST_BIO_REQUESTED_JOB,
      { artistBioId },
      {
        jobId: `artist-bio-${artistBioId}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
}

