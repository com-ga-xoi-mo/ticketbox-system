import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IUserRepository, USER_REPOSITORY } from '../../domain/ports/user-repository.port';
import { OBJECT_STORAGE, ObjectStoragePort } from '../../../platform/storage/object-storage.port';
import { AvatarImageValidator } from '../services/avatar-image-validator';
import { createHash } from 'node:crypto';

export interface UploadAvatarInput {
  userId: string;
  fileBuffer: Buffer;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface UploadAvatarResult {
  avatarAssetId: string;
  avatarUrl: string | null;
}

@Injectable()
export class UploadMyAvatarUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
    private readonly validator: AvatarImageValidator,
  ) {}

  async execute(input: UploadAvatarInput): Promise<UploadAvatarResult> {
    const validated = this.validator.validate(input, 2 * 1024 * 1024); // 2MB limit

    const assetId = randomUUID();
    const storageKey = `avatars/${input.userId}/${assetId}.${validated.extension}`;

    // Upload to storage
    await this.storage.putObject({
      key: storageKey,
      content: input.fileBuffer,
      contentType: validated.contentType,
    });

    const publicUrl = this.storage.getPublicUrl(storageKey);

    let replacedStorageKey: string | null = null;
    try {
      replacedStorageKey = await this.userRepo.replaceAvatar(input.userId, {
        id: assetId,
        storageKey,
        publicUrl,
        originalName: input.originalName,
        contentType: validated.contentType,
        sizeBytes: input.sizeBytes,
      });
    } catch (err) {
      // If DB update fails, clean up the newly uploaded object
      await this.storage.deleteObject(storageKey).catch(() => undefined);
      throw err;
    }

    // Clean up replaced object if any
    if (replacedStorageKey) {
      await this.storage.deleteObject(replacedStorageKey).catch(() => undefined);
    }

    return {
      avatarAssetId: assetId,
      avatarUrl: publicUrl,
    };
  }
}
