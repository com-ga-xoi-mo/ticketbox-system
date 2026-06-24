import {
  EmailAlreadyRegisteredError,
  UserNotFoundError,
} from '../../domain/errors';
import type { IUserRepository, UserRecord, UserFilter } from '../../domain/ports/user-repository.port';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import type { AuthorizeAdminActionUseCase } from './authorize-admin-action.use-case';
import { UserStatus } from '../../domain/user-status.enum';
import type { Actor } from './authorization.types';
import type { CheckinStaffAssignmentRepositoryPort } from '../../domain/ports/checkin-staff-assignment.port';

export interface AdminCommandContext {
  actor: Actor;
}

export class CreateUserAccountUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly authorizeAdmin: AuthorizeAdminActionUseCase,
  ) {}

  async execute(
    ctx: AdminCommandContext,
    params: { email: string; passwordRaw: string; displayName: string; roles: string[] },
  ): Promise<UserRecord> {
    this.authorizeAdmin.execute(ctx.actor);
    const passwordHash = await this.passwordHasher.hash(params.passwordRaw);
    return this.userRepository.createWithRoles(
      {
        email: params.email,
        passwordHash,
        displayName: params.displayName,
      },
      params.roles,
    );
  }
}

export class ListUsersUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authorizeAdmin: AuthorizeAdminActionUseCase,
  ) {}

  async execute(ctx: AdminCommandContext, filter?: UserFilter): Promise<UserRecord[]> {
    this.authorizeAdmin.execute(ctx.actor);
    return this.userRepository.listUsers(filter);
  }
}

export class GetUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authorizeAdmin: AuthorizeAdminActionUseCase,
  ) {}

  async execute(ctx: AdminCommandContext, id: string): Promise<UserRecord> {
    this.authorizeAdmin.execute(ctx.actor);
    const user = await this.userRepository.findById(id);
    if (!user) throw new UserNotFoundError(id);
    return user;
  }
}

export class UpdateUserAccountUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly assignmentRepo: CheckinStaffAssignmentRepositoryPort,
    private readonly authorizeAdmin: AuthorizeAdminActionUseCase,
  ) {}

  async execute(
    ctx: AdminCommandContext,
    id: string,
    params: { displayName?: string; email?: string; roles?: string[] },
  ): Promise<UserRecord> {
    this.authorizeAdmin.execute(ctx.actor);
    
    let user = await this.userRepository.findById(id);
    if (!user) throw new UserNotFoundError(id);

    if (params.displayName !== undefined || params.email !== undefined) {
      user = await this.userRepository.updateProfile(id, { 
        displayName: params.displayName,
        email: params.email
      });
    }

    if (params.roles !== undefined) {
      const oldHasCheckinStaff = user.roles.includes('CHECKIN_STAFF');
      const newHasCheckinStaff = params.roles.includes('CHECKIN_STAFF');

      user = await this.userRepository.setRoles(id, params.roles);

      if (oldHasCheckinStaff && !newHasCheckinStaff) {
        await this.assignmentRepo.revokeAllForStaffUser(id);
      }
    }

    return user;
  }
}

export class SetUserStatusUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly assignmentRepo: CheckinStaffAssignmentRepositoryPort,
    private readonly authorizeAdmin: AuthorizeAdminActionUseCase,
  ) {}

  async execute(
    ctx: AdminCommandContext,
    id: string,
    status: UserStatus,
  ): Promise<UserRecord> {
    this.authorizeAdmin.execute(ctx.actor);
    
    const user = await this.userRepository.findById(id);
    if (!user) throw new UserNotFoundError(id);

    const updatedUser = await this.userRepository.setStatus(id, status);

    if (status === UserStatus.DISABLED) {
      await this.assignmentRepo.revokeAllForStaffUser(id);
    }

    return updatedUser;
  }
}
