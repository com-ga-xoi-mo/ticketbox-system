import { describe, expect, it } from 'vitest';

import { validateEnv } from '../../../platform/config/env.schema';
import type { PlatformConfigService } from '../../../platform/config/platform-config.service';
import { createEmailChannelAdapter } from './email-channel.provider';
import { LocalEmailChannelAdapter } from './local-email-channel.adapter';
import { SmtpEmailChannelAdapter } from './smtp-email-channel.adapter';

function configFixture(
  overrides: Partial<
    Pick<PlatformConfigService, 'emailProvider' | 'emailFrom' | 'emailSmtpHost' | 'emailSmtpPort'>
  > = {},
): PlatformConfigService {
  return {
    emailProvider: 'local',
    emailFrom: 'no-reply@ticketbox.test',
    emailSmtpHost: 'localhost',
    emailSmtpPort: 1025,
    ...overrides,
  } as PlatformConfigService;
}

describe('createEmailChannelAdapter', () => {
  it('selects the deterministic local adapter for EMAIL_PROVIDER=local', () => {
    const adapter = createEmailChannelAdapter(configFixture());

    expect(adapter).toBeInstanceOf(LocalEmailChannelAdapter);
  });

  it('selects the SMTP adapter for EMAIL_PROVIDER=smtp', () => {
    const adapter = createEmailChannelAdapter(configFixture({ emailProvider: 'smtp' }));

    expect(adapter).toBeInstanceOf(SmtpEmailChannelAdapter);
  });

  it('fails fast for unsupported email providers', () => {
    const config = configFixture({
      emailProvider: 'sendgrid' as PlatformConfigService['emailProvider'],
    });

    expect(() => createEmailChannelAdapter(config)).toThrow('Unsupported email provider: sendgrid');
  });

  it('defaults EMAIL_PROVIDER to local when it is absent', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgresql://ticketbox:ticketbox@localhost:5432/ticketbox',
      JWT_SECRET: 'test-secret',
      MOMO_PARTNER_CODE: 'momo-partner',
      MOMO_ACCESS_KEY: 'momo-access',
      MOMO_SECRET_KEY: 'momo-secret',
      VNPAY_TMN_CODE: 'vnpay-terminal',
      VNPAY_HASH_SECRET: 'vnpay-secret',
    });

    expect(env.EMAIL_PROVIDER).toBe('local');
  });
});
