import type { PlatformConfigService } from '../../../platform/config/platform-config.service';
import type { NotificationChannelPort } from '../../domain/ports/notification-channel.port';
import { LocalEmailChannelAdapter } from './local-email-channel.adapter';
import {
  SmtpEmailChannelAdapter,
  SmtpSocketTransport,
} from './smtp-email-channel.adapter';

export function createEmailChannelAdapter(
  config: PlatformConfigService,
): NotificationChannelPort {
  if (config.emailProvider === 'local') {
    return new LocalEmailChannelAdapter();
  }

  if (config.emailProvider === 'smtp') {
    return new SmtpEmailChannelAdapter(
      config.emailFrom,
      new SmtpSocketTransport({
        host: config.emailSmtpHost,
        port: config.emailSmtpPort,
      }),
    );
  }

  throw new Error(`Unsupported email provider: ${config.emailProvider satisfies never}`);
}
