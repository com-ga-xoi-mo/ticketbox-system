import { describe, it, expect, vi } from 'vitest';
import { UploadMyAvatarUseCase } from './upload-my-avatar.use-case';
import type { IUserRepository } from '../../domain/ports/user-repository.port';
import type { ObjectStoragePort } from '../../../platform/storage/object-storage.port';
import { AvatarImageValidator } from '../services/avatar-image-validator';

describe('UploadMyAvatarUseCase', () => {
  it('uploads avatar and replaces old one', async () => {
    const userRepo = { replaceAvatar: vi.fn().mockResolvedValue('old-key') } as unknown as IUserRepository;
    const storage = { 
      putObject: vi.fn(),
      getPublicUrl: vi.fn().mockReturnValue('http://url'),
      deleteObject: vi.fn().mockResolvedValue(undefined)
    } as unknown as ObjectStoragePort;
    const validator = {
      validate: vi.fn().mockReturnValue({ contentType: 'image/jpeg', extension: 'jpg' })
    } as unknown as AvatarImageValidator;
    
    const useCase = new UploadMyAvatarUseCase(userRepo, storage, validator);
    
    const res = await useCase.execute({
      userId: 'user-1',
      fileBuffer: Buffer.from('test'),
      originalName: 'test.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 4
    });
    
    expect(res.avatarUrl).toBe('http://url');
    expect(userRepo.replaceAvatar).toHaveBeenCalled();
    expect(storage.deleteObject).toHaveBeenCalledWith('old-key');
  });
});
