import { afterEach, describe, expect, it, vi } from 'vitest';
import { OAuth2Client } from 'google-auth-library';

import { GoogleIdentityVerifierAdapter } from './google-identity-verifier.adapter';
import { InvalidGoogleCredentialError } from '../../domain/errors';

const config = { googleClientId: 'client.apps.googleusercontent.com' } as any;

describe('GoogleIdentityVerifierAdapter', () => {
  afterEach(() => vi.restoreAllMocks());

  it('maps a fully verified Google payload to a safe projection', async () => {
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        sub: 'google-subject',
        email: 'User@Example.com',
        email_verified: true,
        iss: 'https://accounts.google.com',
        name: ' Google User ',
        picture: 'https://lh3.googleusercontent.com/avatar',
      }),
    } as any);

    await expect(new GoogleIdentityVerifierAdapter(config).verify('credential')).resolves.toEqual({
      subject: 'google-subject',
      email: 'User@Example.com',
      displayName: 'Google User',
      pictureUrl: 'https://lh3.googleusercontent.com/avatar',
    });
  });

  it.each([
    undefined,
    { sub: '', email: 'user@example.com', email_verified: true, iss: 'accounts.google.com' },
    { sub: 'sub', email: '', email_verified: true, iss: 'accounts.google.com' },
    { sub: 'sub', email: 'user@example.com', email_verified: false, iss: 'accounts.google.com' },
    { sub: 'sub', email: 'user@example.com', email_verified: true, iss: 'malicious.example' },
  ])('rejects invalid or incomplete payloads', async (payload) => {
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({ getPayload: () => payload } as any);
    await expect(new GoogleIdentityVerifierAdapter(config).verify('credential')).rejects.toBeInstanceOf(
      InvalidGoogleCredentialError,
    );
  });

  it('maps Google library failures to a generic domain error', async () => {
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValue(new Error('signature details'));
    await expect(new GoogleIdentityVerifierAdapter(config).verify('credential')).rejects.toMatchObject({
      name: 'InvalidGoogleCredentialError',
      message: 'Google authentication failed',
    });
  });
});
