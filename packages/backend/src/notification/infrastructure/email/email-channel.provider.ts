import type { PlatformConfigService } from '../../../platform/config/platform-config.service';
import type { NotificationChannelPort } from '../../domain/ports/notification-channel.port';
import { LocalEmailChannelAdapter } from './local-email-channel.adapter';
import { NodemailerSmtpTransport } from './nodemailer-smtp-transport';
import {
  SmtpEmailChannelAdapter,
  type SmtpEmailTransport,
  SmtpSocketTransport,
} from './smtp-email-channel.adapter';

export function createEmailChannelAdapter(config: PlatformConfigService): NotificationChannelPort {
  if (config.emailProvider === 'local') {
    return new LocalEmailChannelAdapter();
  }

  if (config.emailProvider === 'smtp') {
    return new SmtpEmailChannelAdapter(config.emailFrom, createSmtpTransport(config));
  }

  throw new Error(`Unsupported email provider: ${config.emailProvider satisfies never}`);
}

export function createSmtpTransport(config: PlatformConfigService): SmtpEmailTransport {
  const user = config.emailSmtpUser;
  const pass = config.emailSmtpPass;

  // Credentials present → authenticated TLS transport (e.g. Gmail).
  if (user && pass) {
    return new NodemailerSmtpTransport({
      host: config.emailSmtpHost,
      port: config.emailSmtpPort,
      secure: config.emailSmtpSecure,
      auth: { user, pass },
    });
  }

  // No credentials → plaintext socket transport for the local Maildev demo.
  return new SmtpSocketTransport({
    host: config.emailSmtpHost,
    port: config.emailSmtpPort,
  });
}
