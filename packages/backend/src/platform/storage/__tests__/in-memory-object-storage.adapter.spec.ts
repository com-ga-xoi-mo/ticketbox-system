import { describe, expect, it } from 'vitest';

import { InMemoryObjectStorageAdapter } from '../adapters/in-memory-object-storage.adapter';
import { StorageObjectNotFoundError } from '../storage.errors';

describe('InMemoryObjectStorageAdapter', () => {
  it('stores and reads object content as a defensive copy', async () => {
    const storage = new InMemoryObjectStorageAdapter();
    const content = Buffer.from('stadium map');

    await storage.putObject({
      key: 'seating/concert-1/map.svg',
      content,
      contentType: 'image/svg+xml',
    });
    content.write('X');

    await expect(storage.getObject('seating/concert-1/map.svg')).resolves.toEqual(
      Buffer.from('stadium map'),
    );
  });

  it('throws StorageObjectNotFoundError when the object is missing', async () => {
    const storage = new InMemoryObjectStorageAdapter();

    await expect(storage.getObject('missing.svg')).rejects.toBeInstanceOf(
      StorageObjectNotFoundError,
    );
  });

  it('deletes objects and treats missing deletes as idempotent', async () => {
    const storage = new InMemoryObjectStorageAdapter();
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

  it('returns memory public urls and can clear state', async () => {
    const storage = new InMemoryObjectStorageAdapter();
    await storage.putObject({
      key: 'press-kits/demo.pdf',
      content: Buffer.from('%PDF'),
      contentType: 'application/pdf',
    });

    expect(storage.getPublicUrl('press-kits/demo.pdf')).toBe('memory://press-kits/demo.pdf');
    expect(storage.objects.size).toBe(1);

    storage.clear();

    expect(storage.objects.size).toBe(0);
  });
});
