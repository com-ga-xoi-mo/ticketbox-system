import type { TokenIssuerPort } from '../../domain/ports/token-issuer.port';
import type { GoogleIdentityVerifierPort } from '../../domain/ports/google-identity-verifier.port';
import type { GoogleIdentityRepositoryPort } from '../../domain/ports/google-identity-repository.port';
import {
  AccountLinkRequiredError,
  GoogleAccountNotEligibleError,
} from '../../domain/errors';
import { Role } from '../../domain/role.enum';
import type { AuthTokenResponse } from './register.use-case';

export class GoogleSignInUseCase {
  constructor(
    private readonly verifier: GoogleIdentityVerifierPort,
    private readonly identities: GoogleIdentityRepositoryPort,
    private readonly tokenIssuer: TokenIssuerPort,
  ) {}

  async execute(credential: string): Promise<AuthTokenResponse> {
    const verified = await this.verifier.verify(credential);
    const resolution = await this.identities.resolveOrProvision(verified);
    if (resolution.kind === 'account_link_required') throw new AccountLinkRequiredError();

    const { user } = resolution;
    if (user.status !== 'ACTIVE' || !user.roles.includes(Role.AUDIENCE)) {
      throw new GoogleAccountNotEligibleError();
    }

    return {
      accessToken: this.tokenIssuer.issue({ sub: user.id, roles: [Role.AUDIENCE] }),
    };
  }
}
