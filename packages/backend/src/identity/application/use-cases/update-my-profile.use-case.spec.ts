import { describe, it, expect, vi } from 'vitest';
import { UpdateMyProfileUseCase } from './update-my-profile.use-case';
import type { IUserRepository } from '../../domain/ports/user-repository.port';

describe('UpdateMyProfileUseCase', () => {
  it('updates only provided fields', async () => {
    const userRepo = { updateProfile: vi.fn() } as unknown as IUserRepository;
    const useCase = new UpdateMyProfileUseCase(userRepo);
    
    await useCase.execute('user-1', { displayName: 'New Name', phone: null });
    
    expect(userRepo.updateProfile).toHaveBeenCalledWith('user-1', {
      displayName: 'New Name',
      phone: null,
    });
  });
});
