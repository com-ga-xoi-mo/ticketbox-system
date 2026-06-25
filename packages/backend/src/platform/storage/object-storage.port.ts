export const OBJECT_STORAGE = Symbol('ObjectStoragePort');

export interface PutObjectInput {
  key: string;
  content: Buffer;
  contentType: string;
}

export interface ObjectStoragePort {
  putObject(input: PutObjectInput): Promise<void>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  objectExists(key: string): Promise<boolean>;
  getPublicUrl(key: string): string;
}
