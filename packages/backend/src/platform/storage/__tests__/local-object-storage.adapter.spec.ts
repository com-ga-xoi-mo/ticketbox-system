import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { PlatformConfigService } from '../../config/platform-config.service';
import { LocalObjectStorageAdapter } from '../adapters/local-object-storage.adapter';
import { StorageObjectNotFoundError } from '../storage.errors';

describe('LocalObjectStorageAdapter', () => {
  let tempDir: string;
  let storage: LocalObjectStorageAdapter;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ticketbox-storage-'));
    storage = new LocalObjectStorageAdapter({
      localStorageRootDir: tempDir,
      localStoragePublicBaseUrl: 'http://localhost:3000/storage/',
    } as PlatformConfigService);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('creates directory structure and writes objects', async () => {
    await storage.putObject({
      key: 'seating/concert-1/map.svg',
      content: Buffer.from('<svg />'),
      contentType: 'image/svg+xml',
    });

    const written = await fs.readFile(path.join(tempDir, 'seating/concert-1/map.svg'), 'utf8');

    expect(written).toBe('<svg />');
  });

  it('reads objects from disk', async () => {
    await fs.mkdir(path.join(tempDir, 'press-kits'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'press-kits/demo.pdf'), Buffer.from('%PDF'));

    await expect(storage.getObject('press-kits/demo.pdf')).resolves.toEqual(Buffer.from('%PDF'));
  });

  it('throws StorageObjectNotFoundError when reading a missing object', async () => {
    await expect(storage.getObject('missing.svg')).rejects.toBeInstanceOf(StorageObjectNotFoundError);
  });

  it('deletes objects, checks existence, and ignores missing deletes', async () => {
    await storage.putObject({
      key: 'maps/main.svg',
      content: Buffer.from('<svg />'),
      contentType: 'image/svg+xml',
    });

    await expect(storage.objectExists('maps/main.svg')).resolves.toBe(true);
    await storage.deleteObject('maps/main.svg');
    await expect(storage.objectExists('maps/main.svg')).resolves.toBe(false);
    await expect(storage.deleteObject('maps/main.svg')).resolves.toBeUndefined();
  });

  it('returns public urls without duplicate slashes', () => {
    expect(storage.getPublicUrl('/maps/main.svg')).toBe('http://localhost:3000/storage/maps/main.svg');
  });
});
