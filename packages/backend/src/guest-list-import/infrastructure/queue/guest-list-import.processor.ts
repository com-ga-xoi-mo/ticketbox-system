import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { GUEST_LIST_IMPORT_QUEUE } from '../../../platform/queue/platform-queue.constants';
import { ProcessGuestListImportUseCase } from '../../application/use-cases/process-guest-list-import.use-case';
import type { GuestListImportRequestedJobData } from './guest-list-job.types';

@Processor(GUEST_LIST_IMPORT_QUEUE)
export class GuestListImportProcessor extends WorkerHost {
  constructor(private readonly processImport: ProcessGuestListImportUseCase) {
    super();
  }
  process(job: Job<GuestListImportRequestedJobData>) {
    const finalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    return this.processImport.execute(job.data.batchId, finalAttempt);
  }
}
