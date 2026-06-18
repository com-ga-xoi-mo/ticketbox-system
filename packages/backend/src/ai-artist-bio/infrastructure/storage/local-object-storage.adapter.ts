import { promises as fs } from 'node:fs';
import path from 'node:path';

import { Injectable } from '@nestjs/common';

import type { ObjectStoragePort, PutObjectInput } from '../../domain/ports/object-storage.port';

@Injectable()
export class LocalObjectStorageAdapter implements ObjectStoragePort {
  private readonly rootDir = path.join(process.cwd(), 'data', 'uploads');

  async putObject(input: PutObjectInput): Promise<void> {
    const fullPath = this.resolveStoragePath(input.key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, input.content);
  }

  async getObject(storageKey: string): Promise<Buffer> {
    return fs.readFile(this.resolveStoragePath(storageKey));
  }

  private resolveStoragePath(storageKey: string): string {
    const normalizedKey = storageKey.replace(/\\/g, '/');
    return path.join(this.rootDir, normalizedKey);
  }
}

