import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import type { GuestListStoragePort } from '../../domain/ports/guest-list-storage.port';

@Injectable()
export class LocalGuestListStorageAdapter implements GuestListStoragePort {
  constructor(
    private readonly rootDir = path.resolve(process.cwd(), 'data', 'guest-list-storage'),
  ) {}

  async put(input: {
    key: string;
    content: Buffer;
  }): Promise<{ storageKey: string; sizeBytes: number }> {
    const target = this.resolve(input.key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, input.content);
    return { storageKey: input.key.replace(/\\/g, '/'), sizeBytes: input.content.length };
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  private resolve(key: string): string {
    const target = path.resolve(this.rootDir, key);
    if (target !== this.rootDir && !target.startsWith(`${this.rootDir}${path.sep}`))
      throw new Error('Storage path escapes guest-list root');
    return target;
  }
}
