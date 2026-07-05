import type { JwtPayload } from '../../domain/jwt-payload.interface';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import type { TokenIssuerPort } from '../../domain/ports/token-issuer.port';
import type { IUserRepository } from '../../domain/ports/user-repository.port';
import type { Role } from '../../domain/role.enum';

export interface RegisterCommand {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
}

export interface AuthTokenResponse {
  accessToken: string;
}

/**
 * Application use-case: register a new user.
 *
 * Orchestrates:
 *  1. Hash the plain-text password.
 *  2. Persist user with the AUDIENCE role via the IUserRepository port.
 *  3. Sign and return a JWT access token.
 *
 * This class has no knowledge of HTTP, Prisma, Passport, JWT libraries, bcrypt,
 * or framework DI. All external work is performed through domain ports.
 */
export class RegisterUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenIssuer: TokenIssuerPort,
  ) {}

  async execute(cmd: RegisterCommand): Promise<AuthTokenResponse> {
    const passwordHash = await this.passwordHasher.hash(cmd.password);

    const user = await this.userRepo.createWithAudienceRole({
      email: cmd.email,
      passwordHash,
      displayName: cmd.displayName,
      phone: cmd.phone,
    });

    const payload: JwtPayload = { sub: user.id, roles: user.roles as Role[] };
    return { accessToken: this.tokenIssuer.issue(payload) };
  }
}
