import type { Actor } from '../../../identity/application/use-cases/authorization.types';
import type { AuthorizeAdminActionUseCase } from '../../../identity/application/use-cases/authorize-admin-action.use-case';
import type { GuestListRepositoryPort } from '../../domain/ports/guest-list-repository.port';
import type { GuestListStoragePort } from '../../domain/ports/guest-list-storage.port';

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
    if (!batch.reportStorageKey) throw new Error('Guest-list report is not available');
    return this.storage.get(batch.reportStorageKey);
  }
}
