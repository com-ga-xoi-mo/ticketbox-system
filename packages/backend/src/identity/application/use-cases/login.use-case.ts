import { InvalidCredentialsError } from '../../domain/errors';
import type { JwtPayload } from '../../domain/jwt-payload.interface';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import type { TokenIssuerPort } from '../../domain/ports/token-issuer.port';
import type { IUserRepository } from '../../domain/ports/user-repository.port';
import type { Role } from '../../domain/role.enum';
import type { AuthTokenResponse } from './register.use-case';

export interface LoginCommand {
  email: string;
  password: string;
}

/**
 * Application use-case: authenticate an existing user.
 *
 * Orchestrates:
 *  1. Look up the user by email via the IUserRepository port.
 *  2. Compare the supplied password against the stored bcrypt hash.
 *  3. Reject with a generic error on failure (no email-existence leakage).
 *  4. Sign and return a JWT access token on success.
 *
 * This class has no knowledge of HTTP, Prisma, Passport, JWT libraries, bcrypt,
 * or framework DI. All external work is performed through domain ports.
 */
export class LoginUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenIssuer: TokenIssuerPort,
  ) {}

  async execute(cmd: LoginCommand): Promise<AuthTokenResponse> {
    const user = await this.userRepo.findByEmail(cmd.email);

    // Always compare to prevent timing-based email enumeration
    const isValidPassword =
      user !== null && (await this.passwordHasher.compare(cmd.password, user.passwordHash));

    if (!isValidPassword) {
      throw new InvalidCredentialsError();
    }

    const payload: JwtPayload = { sub: user!.id, roles: user!.roles as Role[] };
    return { accessToken: this.tokenIssuer.issue(payload) };
  }
}
