import { describe, expect, it, vi } from 'vitest';

import { GoogleSignInUseCase } from './google-sign-in.use-case';
import { AccountLinkRequiredError, GoogleAccountNotEligibleError } from '../../domain/errors';
import { UserStatus } from '../../domain/user-status.enum';

const verified = {
  subject: 'google-subject',
  email: 'audience@example.com',
  displayName: 'Audience User',
  pictureUrl: 'https://lh3.googleusercontent.com/avatar',
};

function makeUser(roles: string[] = ['AUDIENCE'], status: UserStatus = UserStatus.ACTIVE) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: verified.email,
    displayName: verified.displayName,
    roles,
    status,
  };
}

describe('GoogleSignInUseCase', () => {
  it('issues an audience-scoped TicketBox token for an eligible linked user', async () => {
    const verifier = { verify: vi.fn().mockResolvedValue(verified) };
    const identities = {
      resolveOrProvision: vi.fn().mockResolvedValue({
        kind: 'resolved',
        user: makeUser(['AUDIENCE', 'ADMIN']),
        created: false,
      }),
    };
    const tokenIssuer = { issue: vi.fn().mockReturnValue('ticketbox-jwt') };
    const result = await new GoogleSignInUseCase(verifier, identities, tokenIssuer).execute('credential');

    expect(result).toEqual({ accessToken: 'ticketbox-jwt' });
    expect(tokenIssuer.issue).toHaveBeenCalledWith({
      sub: '11111111-1111-4111-8111-111111111111',
      roles: ['AUDIENCE'],
    });
  });

  it('rejects an existing email that is not linked', async () => {
    const useCase = new GoogleSignInUseCase(
      { verify: vi.fn().mockResolvedValue(verified) },
      { resolveOrProvision: vi.fn().mockResolvedValue({ kind: 'account_link_required' }) },
      { issue: vi.fn() },
    );
    await expect(useCase.execute('credential')).rejects.toBeInstanceOf(AccountLinkRequiredError);
  });

  it.each([
    [[], UserStatus.ACTIVE],
    [['ADMIN'], UserStatus.ACTIVE],
    [['AUDIENCE'], UserStatus.DISABLED],
  ])('rejects ineligible roles/status without issuing a token', async (roles, status) => {
    const tokenIssuer = { issue: vi.fn() };
    const useCase = new GoogleSignInUseCase(
      { verify: vi.fn().mockResolvedValue(verified) },
      {
        resolveOrProvision: vi.fn().mockResolvedValue({
          kind: 'resolved',
          user: makeUser(roles as string[], status as UserStatus),
          created: false,
        }),
      },
      tokenIssuer,
    );
    await expect(useCase.execute('credential')).rejects.toBeInstanceOf(GoogleAccountNotEligibleError);
    expect(tokenIssuer.issue).not.toHaveBeenCalled();
  });
});
