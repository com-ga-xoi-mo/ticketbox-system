import { ForbiddenAdminActionError } from '../../domain/errors';
import { Role } from '../../domain/role.enum';
import type { Actor } from './authorization.types';

export class AuthorizeAdminActionUseCase {
  execute(actor: Actor): void {
    if (!actor.roles.includes(Role.ADMIN)) {
      throw new ForbiddenAdminActionError();
    }
  }
}
