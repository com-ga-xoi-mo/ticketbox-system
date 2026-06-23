import type { GuestListQueuePort } from '../../domain/ports/guest-list-queue.port';
import type { GuestListRepositoryPort } from '../../domain/ports/guest-list-repository.port';

export class ReconcileGuestListJobsUseCase {
  constructor(
    private readonly repository: GuestListRepositoryPort,
    private readonly queue: GuestListQueuePort,
  ) {}
  async execute(): Promise<number> {
    const ids = await this.repository.listPendingBatchIds();
    for (const id of ids) await this.queue.ensureImportJob(id);
    return ids.length;
  }
}
