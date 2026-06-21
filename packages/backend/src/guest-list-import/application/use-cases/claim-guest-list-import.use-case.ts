import { GuestListBatchStatus } from '@prisma/client';
import { sha256 } from '../../domain/normalization';
import type { GuestListQueuePort } from '../../domain/ports/guest-list-queue.port';
import type { GuestListRepositoryPort } from '../../domain/ports/guest-list-repository.port';
import type { GuestListStoragePort } from '../../domain/ports/guest-list-storage.port';

export interface ClaimGuestListImportCommand {
  concertId: string;
  sourceName: string;
  contentType: string;
  content: Buffer;
  uploadedById?: string;
}

export class ClaimGuestListImportUseCase {
  constructor(
    private readonly repository: GuestListRepositoryPort,
    private readonly storage: GuestListStoragePort,
    private readonly queue: GuestListQueuePort,
  ) {}

  async execute(command: ClaimGuestListImportCommand) {
    if (!(await this.repository.concertExists(command.concertId)))
      throw new Error('Concert not found');
    const checksum = sha256(command.content);
    const storageKey = `sources/${command.concertId}/${checksum}.csv`;
    const stored = await this.storage.put({
      key: storageKey,
      content: command.content,
      contentType: command.contentType,
    });
    const result = await this.repository.claimBatch({
      concertId: command.concertId,
      uploadedById: command.uploadedById,
      sourceName: command.sourceName,
      contentType: command.contentType,
      sizeBytes: stored.sizeBytes,
      storageKey: stored.storageKey,
      checksum,
    });
    const terminal = new Set<GuestListBatchStatus>([
      GuestListBatchStatus.COMPLETED,
      GuestListBatchStatus.COMPLETED_WITH_ERRORS,
      GuestListBatchStatus.FAILED,
    ]);
    if (!terminal.has(result.batch.status)) {
      await this.queue.ensureImportJob(result.batch.id);
    }
    return {
      ...result,
      outcome: result.created ? ('CREATED' as const) : ('IDEMPOTENT_DUPLICATE' as const),
    };
  }
}
