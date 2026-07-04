export const GOOGLE_IDENTITY_VERIFIER = Symbol('GoogleIdentityVerifierPort');

export interface VerifiedGoogleIdentity {
  subject: string;
  email: string;
  displayName: string | null;
  pictureUrl: string | null;
}

export interface GoogleIdentityVerifierPort {
  verify(credential: string): Promise<VerifiedGoogleIdentity>;
}
