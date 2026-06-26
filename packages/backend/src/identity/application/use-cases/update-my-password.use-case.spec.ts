import { describe, it, expect, vi } from 'vitest';
import { UpdateMyPasswordUseCase } from './update-my-password.use-case';
import type { IUserRepository } from '../../domain/ports/user-repository.port';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { InvalidCredentialsError } from '../../domain/errors';
import { Role } from '../../domain/role.enum';
import { UserStatus } from '../../domain/user-status.enum';

describe('UpdateMyPasswordUseCase', () => {
  it('updates password if current password is valid', async () => {
    const userRepo = { 
      findByIdWithPassword: vi.fn().mockResolvedValue({ id: 'user-1', passwordHash: 'old-hash', roles: [], email: 'test@test.com', displayName: 'Test', status: UserStatus.ACTIVE }),
      updatePassword: vi.fn()
    } as unknown as IUserRepository;
    const hasher = { 
      compare: vi.fn().mockResolvedValue(true),
      hash: vi.fn().mockResolvedValue('new-hash')
    } as unknown as PasswordHasherPort;
    
    const useCase = new UpdateMyPasswordUseCase(userRepo, hasher);
    
    await useCase.execute('user-1', { currentPassword: 'old', newPassword: 'new' });
    
    expect(hasher.compare).toHaveBeenCalledWith('old', 'old-hash');
    expect(hasher.hash).toHaveBeenCalledWith('new');
    expect(userRepo.updatePassword).toHaveBeenCalledWith('user-1', 'new-hash');
  });

  it('throws if current password is wrong', async () => {
    const userRepo = { 
      findByIdWithPassword: vi.fn().mockResolvedValue({ id: 'user-1', passwordHash: 'old-hash', roles: [], email: 'test@test.com', displayName: 'Test', status: UserStatus.ACTIVE })
    } as unknown as IUserRepository;
    const hasher = { 
      compare: vi.fn().mockResolvedValue(false)
    } as unknown as PasswordHasherPort;
    
    const useCase = new UpdateMyPasswordUseCase(userRepo, hasher);
    
    await expect(useCase.execute('user-1', { currentPassword: 'wrong', newPassword: 'new' })).rejects.toThrow(InvalidCredentialsError);
  });
});
