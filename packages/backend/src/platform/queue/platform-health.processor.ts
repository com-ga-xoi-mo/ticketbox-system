import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { PLATFORM_HEALTH_QUEUE } from './platform-queue.constants';

@Processor(PLATFORM_HEALTH_QUEUE)
export class PlatformHealthProcessor extends WorkerHost {
  async process(job: Job): Promise<{ ok: true; jobId: string | number | undefined }> {
    return {
      ok: true,
      jobId: job.id,
    };
  }
}
