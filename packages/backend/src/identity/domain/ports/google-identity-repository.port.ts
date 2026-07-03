import type { UserRecord } from './user-repository.port';
import type { VerifiedGoogleIdentity } from './google-identity-verifier.port';

export const GOOGLE_IDENTITY_REPOSITORY = Symbol('GoogleIdentityRepositoryPort');

export type GoogleIdentityResolution =
  | { kind: 'resolved'; user: UserRecord; created: boolean }
  | { kind: 'account_link_required' };

export interface GoogleIdentityRepositoryPort {
  resolveOrProvision(identity: VerifiedGoogleIdentity): Promise<GoogleIdentityResolution>;
}
