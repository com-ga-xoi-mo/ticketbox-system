import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { AuthController } from './auth.controller';
import {
  AccountLinkRequiredError,
  GoogleAccountNotEligibleError,
  InvalidGoogleCredentialError,
} from '../../domain/errors';

function makeController(googleResult: unknown) {
  const google = {
    execute:
      googleResult instanceof Error
        ? vi.fn().mockRejectedValue(googleResult)
        : vi.fn().mockResolvedValue(googleResult),
  };
  return { controller: new AuthController({} as any, {} as any, google as any, {} as any, {} as any), google };
}

describe('AuthController Google login', () => {
  it('returns the canonical token response', async () => {
    const { controller, google } = makeController({ accessToken: 'ticketbox-jwt' });
    await expect(controller.googleLogin({ credential: 'credential' })).resolves.toEqual({
      accessToken: 'ticketbox-jwt',
    });
    expect(google.execute).toHaveBeenCalledWith('credential');
  });

  it('maps account collision to a stable conflict payload', async () => {
    const { controller } = makeController(new AccountLinkRequiredError());
    const error = await controller.googleLogin({ credential: 'credential' }).catch((caught) => caught);
    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toMatchObject({ code: 'ACCOUNT_LINK_REQUIRED' });
  });

  it.each([new InvalidGoogleCredentialError(), new GoogleAccountNotEligibleError()])(
    'maps provider/account failures to generic unauthorized',
    async (domainError) => {
      const { controller } = makeController(domainError);
      await expect(controller.googleLogin({ credential: 'credential' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    },
  );
});
