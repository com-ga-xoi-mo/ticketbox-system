import { GuestListBatchStatus } from '@prisma/client';

import type { Actor } from '../../../identity/application/use-cases/authorization.types';
import type { AuthorizeAdminActionUseCase } from '../../../identity/application/use-cases/authorize-admin-action.use-case';
import { GuestListBatchNotCompletedError } from '../../domain/errors';
import type { GuestListRepositoryPort } from '../../domain/ports/guest-list-repository.port';
import type { GuestListStoragePort } from '../../domain/ports/guest-list-storage.port';

const REPORTABLE_STATUSES = new Set<GuestListBatchStatus>([
  GuestListBatchStatus.COMPLETED,
  GuestListBatchStatus.COMPLETED_WITH_ERRORS,
]);

export class GetGuestListBatchesUseCase {
  constructor(
    private readonly repository: GuestListRepositoryPort,
    private readonly storage: GuestListStoragePort,
    private readonly authorizeAdmin: AuthorizeAdminActionUseCase,
  ) {}
  async list(actor: Actor, concertId: string) {
    this.authorizeAdmin.execute(actor);
    if (!(await this.repository.concertExists(concertId))) throw new Error('Concert not found');
    return this.repository.listBatches(concertId);
  }
  async get(actor: Actor, concertId: string, batchId: string) {
    this.authorizeAdmin.execute(actor);
    if (!(await this.repository.concertExists(concertId))) throw new Error('Concert not found');
    const batch = await this.repository.findBatch(batchId);
    if (!batch || batch.concertId !== concertId) throw new Error('Guest-list batch not found');
    return batch;
  }
  async report(actor: Actor, concertId: string, batchId: string) {
    const batch = await this.get(actor, concertId, batchId);
    if (!REPORTABLE_STATUSES.has(batch.status)) {
      throw new GuestListBatchNotCompletedError(batch.id, batch.status);
    }
    if (!batch.reportStorageKey) throw new Error('Guest-list report is not available');
    return this.storage.get(batch.reportStorageKey);
  }
}
