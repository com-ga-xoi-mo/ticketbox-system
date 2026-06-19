import type { ObjectStoragePort, PutObjectInput } from '../object-storage.port';
import { StorageObjectNotFoundError } from '../storage.errors';

interface StoredObject {
  content: Buffer;
  contentType: string;
}

export class InMemoryObjectStorageAdapter implements ObjectStoragePort {
  readonly objects = new Map<string, StoredObject | Buffer>();

  async putObject(input: PutObjectInput): Promise<void> {
    this.objects.set(input.key, {
      content: Buffer.from(input.content),
      contentType: input.contentType,
    });
  }

  async getObject(key: string): Promise<Buffer> {
    const object = this.objects.get(key);
    if (!object) {
      throw new StorageObjectNotFoundError(key);
    }
    if (Buffer.isBuffer(object)) {
      return Buffer.from(object);
    }
    return Buffer.from(object.content);
  }

  async deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async objectExists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  getPublicUrl(key: string): string {
    return `memory://${key}`;
  }

  clear(): void {
    this.objects.clear();
  }
}
