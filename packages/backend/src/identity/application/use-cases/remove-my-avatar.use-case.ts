import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/ports/user-repository.port';
import { OBJECT_STORAGE, ObjectStoragePort } from '../../../platform/storage/object-storage.port';

@Injectable()
export class RemoveMyAvatarUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
  ) {}

  async execute(userId: string): Promise<void> {
    const replacedStorageKey = await this.userRepo.clearAvatar(userId);
    if (replacedStorageKey) {
      await this.storage.deleteObject(replacedStorageKey).catch(() => undefined);
    }
  }
}
