import { randomUUID } from 'node:crypto';
import { GuestListRowDisposition } from '@prisma/client';
import {
  GuestListBatchBusyError,
  GuestListBatchNotFoundError,
  GuestListBatchOutOfOrderError,
  GuestListValidationError,
} from '../../domain/errors';
import { identityFingerprint } from '../../domain/normalization';
import type { GuestListRepositoryPort } from '../../domain/ports/guest-list-repository.port';
import type { GuestListStoragePort } from '../../domain/ports/guest-list-storage.port';
import type { GuestListCsvParser } from '../../infrastructure/csv/guest-list-csv.parser';

export class ProcessGuestListImportUseCase {
  constructor(
    private readonly repository: GuestListRepositoryPort,
    private readonly storage: GuestListStoragePort,
    private readonly parser: GuestListCsvParser,
    private readonly leaseMs: number,
  ) {}

  async execute(batchId: string, finalAttempt = false) {
    const existing = await this.repository.findBatch(batchId);
    if (!existing) throw new GuestListBatchNotFoundError(batchId);
    if (await this.repository.hasEarlierNonTerminal(existing))
      throw new GuestListBatchOutOfOrderError(batchId);
    const now = new Date();
    const claimed = await this.repository.claimProcessingLease({
      batchId,
      owner: randomUUID(),
      now,
      expiresAt: new Date(now.getTime() + this.leaseMs),
    });
    if (!claimed) throw new GuestListBatchBusyError(batchId);
    try {
      if (!claimed.sourceStorageKey) throw new Error('Batch source asset is unavailable');
      const content = await this.storage.get(claimed.sourceStorageKey);
      const rows = this.parser.parse(content, claimed.sourceContentType ?? 'text/csv');
      const seen = new Set<string>();
      for (const row of rows) {
        let disposition: GuestListRowDisposition = GuestListRowDisposition.IMPORTED;
        let reasonCode: string | undefined;
        let reasonMessage: string | undefined;
        if (row.validationReason) {
          disposition = GuestListRowDisposition.INVALID;
          reasonCode = 'ROW_VALIDATION';
          reasonMessage = row.validationReason;
        } else {
          const fingerprints = identityFingerprint(row);
          if (fingerprints.some((value) => seen.has(value))) {
            disposition = GuestListRowDisposition.DUPLICATE;
            reasonCode = 'DUPLICATE_IN_FILE';
            reasonMessage = 'A previous row uses the same natural identifier';
          } else fingerprints.forEach((value) => seen.add(value));
        }
        await this.repository.applyRow(claimed, { ...row, disposition, reasonCode, reasonMessage });
      }
      const summary = await this.repository.summarizeRows(batchId);
      const evidence = await this.repository.listRows(batchId);
      const reportKey = `reports/${claimed.concertId}/${claimed.checksum ?? batchId}.json`;
      await this.storage.put({
        key: reportKey,
        contentType: 'application/json',
        content: Buffer.from(
          JSON.stringify(
            {
              batchId,
              concertId: claimed.concertId,
              checksum: claimed.checksum,
              summary,
              rows: evidence,
            },
            null,
            2,
          ),
        ),
      });
      await this.repository.completeBatch(batchId, summary, reportKey);
      return { batchId, summary };
    } catch (error) {
      const code = error instanceof GuestListValidationError ? error.code : 'PROCESSING_FAILED';
      const message = error instanceof Error ? error.message : 'Unknown processing failure';
      if (error instanceof GuestListValidationError || finalAttempt)
        await this.repository.failBatch(batchId, code, message);
      else await this.repository.releaseProcessingLease(batchId);
      if (!(error instanceof GuestListValidationError)) throw error;
      return { batchId, failed: true, code };
    }
  }
}
