import type { GuestListFileSourcePort } from '../../domain/ports/guest-list-file-source.port';
import type { ClaimGuestListImportUseCase } from './claim-guest-list-import.use-case';

export class DiscoverGuestListFilesUseCase {
  constructor(
    private readonly source: GuestListFileSourcePort,
    private readonly claim: ClaimGuestListImportUseCase,
  ) {}
  async execute() {
    const results: Array<{ sourceName: string; ok: boolean; error?: string }> = [];
    for (const candidate of await this.source.discover()) {
      try {
        const result = await this.claim.execute({
          ...candidate,
          content: await this.source.read(candidate),
        });
        await this.source.archive(candidate, result.batch.checksum!);
        results.push({ sourceName: candidate.sourceName, ok: true });
      } catch (error) {
        results.push({
          sourceName: candidate.sourceName,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return results;
  }
}
