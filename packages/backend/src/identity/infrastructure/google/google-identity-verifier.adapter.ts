import { Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

import { PlatformConfigService } from '../../../platform/config/platform-config.service';
import { InvalidGoogleCredentialError } from '../../domain/errors';
import type {
  GoogleIdentityVerifierPort,
  VerifiedGoogleIdentity,
} from '../../domain/ports/google-identity-verifier.port';

@Injectable()
export class GoogleIdentityVerifierAdapter implements GoogleIdentityVerifierPort {
  private readonly client: OAuth2Client | null;
  private readonly audience: string | undefined;

  constructor(config: PlatformConfigService) {
    const audience = config.googleClientId;
    this.audience = audience;
    this.client = audience ? new OAuth2Client(audience) : null;
  }

  async verify(credential: string): Promise<VerifiedGoogleIdentity> {
    try {
      if (!this.client || !this.audience) {
        throw new InvalidGoogleCredentialError();
      }
      const ticket = await this.client.verifyIdToken({ idToken: credential, audience: this.audience });
      const payload = ticket.getPayload();
      if (
        !payload?.sub ||
        !payload.email ||
        payload.email_verified !== true ||
        !payload.iss ||
        !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)
      ) {
        throw new InvalidGoogleCredentialError();
      }

      return {
        subject: payload.sub,
        email: payload.email,
        displayName: payload.name?.trim() || null,
        pictureUrl: payload.picture || null,
      };
    } catch (error) {
      if (error instanceof InvalidGoogleCredentialError) throw error;
      throw new InvalidGoogleCredentialError();
    }
  }
}
