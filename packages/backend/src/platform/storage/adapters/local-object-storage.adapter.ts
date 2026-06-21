import { promises as fs } from 'node:fs';
import path from 'node:path';

import { Injectable } from '@nestjs/common';

import type { PlatformConfigService } from '../../config/platform-config.service';
import type { ObjectStoragePort, PutObjectInput } from '../object-storage.port';
import { StorageObjectNotFoundError, StorageUploadError } from '../storage.errors';

@Injectable()
export class LocalObjectStorageAdapter implements ObjectStoragePort {
  private readonly rootDir: string;
  private readonly publicBaseUrl: string;

  constructor(config: PlatformConfigService) {
    this.rootDir = path.resolve(process.cwd(), config.localStorageRootDir);
    this.publicBaseUrl = trimTrailingSlash(config.localStoragePublicBaseUrl);
  }

  async putObject(input: PutObjectInput): Promise<void> {
    try {
      const fullPath = this.resolveStoragePath(input.key);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, input.content);
    } catch (error) {
      throw new StorageUploadError(`Failed to write storage object: ${input.key}`, {
        cause: error,
      });
    }
  }

  async getObject(key: string): Promise<Buffer> {
    try {
      return await fs.readFile(this.resolveStoragePath(key));
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        throw new StorageObjectNotFoundError(key, { cause: error });
      }
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolveStoragePath(key));
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') return;
      throw error;
    }
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolveStoragePath(key));
      return true;
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') return false;
      throw error;
    }
  }

  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${normalizeKey(key)}`;
  }

  private resolveStoragePath(key: string): string {
    const normalizedKey = normalizeKey(key);
    const fullPath = path.resolve(this.rootDir, normalizedKey);
    const relativePath = path.relative(this.rootDir, fullPath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new StorageUploadError(`Invalid storage key: ${key}`);
    }
    return fullPath;
  }
}

function normalizeKey(key: string): string {
  return key.replace(/\\/g, '/').replace(/^\/+/, '');
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
