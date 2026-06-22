import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlatformConfigService } from '../../config/platform-config.service';
import { S3CompatibleObjectStorageAdapter } from '../adapters/s3-compatible-object-storage.adapter';
import {
  StorageObjectNotFoundError,
  StorageUnavailableError,
  StorageUploadError,
} from '../storage.errors';

function createConfig(): PlatformConfigService {
  return {
    s3Endpoint: 'https://example-account.r2.cloudflarestorage.com',
    s3Region: 'auto',
    s3Bucket: 'ticketbox-assets',
    s3AccessKeyId: 'access-key',
    s3SecretAccessKey: 'secret-key',
    s3PublicBaseUrl: 'https://assets.example.com/',
  } as PlatformConfigService;
}

function notFoundError(): Error {
  return Object.assign(new Error('not found'), {
    name: 'NotFound',
    $metadata: { httpStatusCode: 404 },
  });
}

describe('S3CompatibleObjectStorageAdapter', () => {
  let send: ReturnType<typeof vi.fn>;
  let storage: S3CompatibleObjectStorageAdapter;

  beforeEach(() => {
    send = vi.fn();
    storage = new S3CompatibleObjectStorageAdapter(createConfig(), {
      send,
    } as unknown as S3Client);
  });

  it('uploads objects with PutObjectCommand', async () => {
    send.mockResolvedValueOnce({});

    await storage.putObject({
      key: 'seating/concert-1/map.svg',
      content: Buffer.from('<svg />'),
      contentType: 'image/svg+xml',
    });

    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: 'ticketbox-assets',
      Key: 'seating/concert-1/map.svg',
      ContentType: 'image/svg+xml',
    });
  });

  it('wraps upload failures as StorageUploadError', async () => {
    send.mockRejectedValueOnce(new Error('sdk failed'));

    await expect(
      storage.putObject({
        key: 'maps/main.svg',
        content: Buffer.from('<svg />'),
        contentType: 'image/svg+xml',
      }),
    ).rejects.toBeInstanceOf(StorageUploadError);
  });

  it('downloads objects with GetObjectCommand', async () => {
    send.mockResolvedValueOnce({
      Body: {
        transformToByteArray: async () => new Uint8Array(Buffer.from('<svg />')),
      },
    });

    await expect(storage.getObject('maps/main.svg')).resolves.toEqual(Buffer.from('<svg />'));
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
  });

  it('maps missing downloads to StorageObjectNotFoundError', async () => {
    send.mockRejectedValueOnce(notFoundError());

    await expect(storage.getObject('missing.svg')).rejects.toBeInstanceOf(
      StorageObjectNotFoundError,
    );
  });

  it('deletes objects and treats missing keys as idempotent', async () => {
    send.mockResolvedValueOnce({});
    await storage.deleteObject('maps/main.svg');
    expect(send.mock.calls[0][0]).toBeInstanceOf(DeleteObjectCommand);

    send.mockRejectedValueOnce(notFoundError());
    await expect(storage.deleteObject('maps/main.svg')).resolves.toBeUndefined();
  });

  it('checks object existence with HeadObjectCommand', async () => {
    send.mockResolvedValueOnce({});
    await expect(storage.objectExists('maps/main.svg')).resolves.toBe(true);
    expect(send.mock.calls[0][0]).toBeInstanceOf(HeadObjectCommand);

    send.mockRejectedValueOnce(notFoundError());
    await expect(storage.objectExists('missing.svg')).resolves.toBe(false);
  });

  it('wraps connectivity errors as StorageUnavailableError', async () => {
    send.mockRejectedValueOnce(Object.assign(new Error('network'), { code: 'ENOTFOUND' }));

    await expect(storage.objectExists('maps/main.svg')).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
  });

  it('returns public urls from configured base url', () => {
    expect(storage.getPublicUrl('/maps/main.svg')).toBe('https://assets.example.com/maps/main.svg');
  });
});
