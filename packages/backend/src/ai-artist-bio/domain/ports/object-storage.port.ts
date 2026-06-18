export const OBJECT_STORAGE = Symbol('ObjectStoragePort');

export interface PutObjectInput {
  key: string;
  content: Buffer;
  contentType: string;
}

export interface ObjectStoragePort {
  putObject(input: PutObjectInput): Promise<void>;
  getObject(storageKey: string): Promise<Buffer>;
}

