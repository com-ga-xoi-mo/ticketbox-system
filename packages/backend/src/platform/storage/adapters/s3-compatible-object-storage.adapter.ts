import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';

import type { PlatformConfigService } from '../../config/platform-config.service';
import type { ObjectStoragePort, PutObjectInput } from '../object-storage.port';
import {
  StorageObjectNotFoundError,
  StorageUnavailableError,
  StorageUploadError,
} from '../storage.errors';

interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
}

export class S3CompatibleObjectStorageAdapter implements ObjectStoragePort {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(config: PlatformConfigService, client?: S3Client) {
    const s3Config = readS3Config(config);
    this.bucket = s3Config.bucket;
    this.publicBaseUrl = trimTrailingSlash(s3Config.publicBaseUrl);
    this.client =
      client ??
      new S3Client({
        endpoint: s3Config.endpoint,
        region: s3Config.region,
        credentials: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
        },
      } satisfies S3ClientConfig);
  }

  async putObject(input: PutObjectInput): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: input.key,
          Body: input.content,
          ContentType: input.contentType,
        }),
      );
    } catch (error) {
      if (isConnectivityError(error)) {
        throw new StorageUnavailableError('Object storage endpoint is unreachable', {
          cause: error,
        });
      }
      throw new StorageUploadError(`Failed to upload storage object: ${input.key}`, {
        cause: error,
      });
    }
  }

  async getObject(key: string): Promise<Buffer> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      if (!response.Body) {
        throw new StorageObjectNotFoundError(key);
      }
      return Buffer.from(await response.Body.transformToByteArray());
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new StorageObjectNotFoundError(key, { cause: error });
      }
      if (isConnectivityError(error)) {
        throw new StorageUnavailableError('Object storage endpoint is unreachable', {
          cause: error,
        });
      }
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      if (isNotFoundError(error)) return;
      if (isConnectivityError(error)) {
        throw new StorageUnavailableError('Object storage endpoint is unreachable', {
          cause: error,
        });
      }
      throw error;
    }
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch (error) {
      if (isNotFoundError(error)) return false;
      if (isConnectivityError(error)) {
        throw new StorageUnavailableError('Object storage endpoint is unreachable', {
          cause: error,
        });
      }
      throw error;
    }
  }

  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key.replace(/^\/+/, '')}`;
  }
}

function readS3Config(config: PlatformConfigService): S3Config {
  return {
    endpoint: config.s3Endpoint,
    region: config.s3Region,
    bucket: config.s3Bucket,
    accessKeyId: config.s3AccessKeyId,
    secretAccessKey: config.s3SecretAccessKey,
    publicBaseUrl: config.s3PublicBaseUrl,
  };
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof NoSuchKey || error instanceof NotFound || getErrorName(error) === 'NotFound'
  );
}

function isConnectivityError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT';
}

function getErrorName(error: unknown): string | undefined {
  return error instanceof Error ? error.name : undefined;
}

function getErrorCode(error: unknown): string | undefined {
  if (error instanceof Error && 'code' in error) {
    return String((error as { code?: unknown }).code);
  }
  return undefined;
}
