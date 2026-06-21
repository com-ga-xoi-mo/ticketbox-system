import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import type {
  GuestListFileCandidate,
  GuestListFileSourcePort,
} from '../../domain/ports/guest-list-file-source.port';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class LocalInboxFileSourceAdapter implements GuestListFileSourcePort {
  private readonly logger = new Logger(LocalInboxFileSourceAdapter.name);
  constructor(
    private readonly inboxRoot = path.resolve(process.cwd(), 'data', 'guest-list-inbox'),
    private readonly archiveRoot = path.resolve(process.cwd(), 'data', 'guest-list-archive'),
  ) {}

  async discover(): Promise<GuestListFileCandidate[]> {
    let directories: string[];
    try {
      directories = await fs.readdir(this.inboxRoot);
    } catch (error: unknown) {
      if (hasCode(error, 'ENOENT')) return [];
      throw error;
    }
    const candidates: GuestListFileCandidate[] = [];
    for (const concertId of directories.sort()) {
      if (!UUID.test(concertId)) {
        this.logger.warn(`Skipping guest-list directory with invalid concert UUID: ${concertId}`);
        continue;
      }
      const concertDir = this.safePath(this.inboxRoot, concertId);
      const stat = await fs.lstat(concertDir).catch(() => null);
      if (!stat?.isDirectory() || stat.isSymbolicLink()) {
        this.logger.warn(`Skipping unsafe guest-list concert directory: ${concertId}`);
        continue;
      }
      const names = await fs.readdir(concertDir).catch(() => []);
      for (const name of names.filter((item) => item.toLowerCase().endsWith('.csv')).sort()) {
        const absolutePath = this.safePath(concertDir, name);
        const fileStat = await fs.lstat(absolutePath).catch(() => null);
        if (!fileStat?.isFile() || fileStat.isSymbolicLink()) {
          this.logger.warn(`Skipping unsafe guest-list candidate: ${absolutePath}`);
          continue;
        }
        candidates.push({ concertId, sourceName: name, absolutePath, contentType: 'text/csv' });
      }
    }
    return candidates;
  }

  async read(candidate: GuestListFileCandidate): Promise<Buffer> {
    const target = this.safePath(
      this.inboxRoot,
      path.relative(this.inboxRoot, candidate.absolutePath),
    );
    const stat = await fs.lstat(target);
    if (!stat.isFile() || stat.isSymbolicLink())
      throw new Error('Guest-list candidate must be a regular file');
    return fs.readFile(target);
  }

  async archive(candidate: GuestListFileCandidate, checksum: string): Promise<void> {
    const destination = this.safePath(this.archiveRoot, candidate.concertId, `${checksum}.csv`);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    try {
      await fs.rename(candidate.absolutePath, destination);
    } catch (error: unknown) {
      if (!hasCode(error, 'ENOENT')) throw error;
    }
  }

  private safePath(root: string, ...parts: string[]): string {
    const resolved = path.resolve(root, ...parts);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`))
      throw new Error('Guest-list path escapes configured root');
    return resolved;
  }
}

function hasCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
