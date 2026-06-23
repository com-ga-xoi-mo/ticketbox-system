import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { GuestListBatchStatus } from '@prisma/client';
import type { Queue } from 'bullmq';
import { PlatformConfigService } from '../../../platform/config/platform-config.service';
import {
  GUEST_LIST_IMPORT_QUEUE,
  GUEST_LIST_IMPORT_REQUESTED_JOB,
} from '../../../platform/queue/platform-queue.constants';
import type { GuestListQueuePort } from '../../domain/ports/guest-list-queue.port';
import {
  GUEST_LIST_REPOSITORY,
  type GuestListRepositoryPort,
} from '../../domain/ports/guest-list-repository.port';
import type { GuestListImportRequestedJobData } from './guest-list-job.types';

const TERMINAL_BATCH_STATUSES = new Set<GuestListBatchStatus>([
  GuestListBatchStatus.COMPLETED,
  GuestListBatchStatus.COMPLETED_WITH_ERRORS,
  GuestListBatchStatus.FAILED,
]);

@Injectable()
export class GuestListImportProducer implements GuestListQueuePort {
  constructor(
    @InjectQueue(GUEST_LIST_IMPORT_QUEUE)
    private readonly queue: Queue<GuestListImportRequestedJobData>,
    private readonly config: PlatformConfigService,
    @Inject(GUEST_LIST_REPOSITORY)
    private readonly repository: GuestListRepositoryPort,
  ) {}
  async ensureImportJob(batchId: string): Promise<void> {
    const batch = await this.repository.findBatch(batchId);
    if (!batch || TERMINAL_BATCH_STATUSES.has(batch.status)) return;

    const jobId = `guest-list-${batchId}`;
    const existing = await this.queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'waiting' || state === 'delayed' || state === 'active') return;
      if (state === 'failed' || state === 'completed') {
        try {
          await existing.retry(state);
          return;
        } catch (error) {
          const raced = await this.queue.getJob(jobId);
          if (raced) {
            const racedState = await raced.getState();
            if (racedState === 'waiting' || racedState === 'delayed' || racedState === 'active')
              return;
            throw error;
          }
        }
      } else {
        try {
          await existing.remove();
        } catch (error) {
          const raced = await this.queue.getJob(jobId);
          if (raced) throw error;
        }
      }
    }
    try {
      await this.addJob(batchId, jobId);
    } catch (error) {
      if (await this.queue.getJob(jobId)) return;
      throw error;
    }
  }

  private async addJob(batchId: string, jobId: string) {
    await this.queue.add(
      GUEST_LIST_IMPORT_REQUESTED_JOB,
      { version: 1, batchId },
      {
        jobId,
        attempts: this.config.guestListMaxAttempts,
        backoff: { type: 'exponential', delay: this.config.guestListRetryBackoffMs },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
}
