import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { NotificationChannelPort } from '../../domain/ports/notification-channel.port';
import type { DeliveryRequest, DeliveryResult } from '../../domain/notification.types';

@Injectable()
export class LocalEmailChannelAdapter implements NotificationChannelPort {
  async send(request: DeliveryRequest): Promise<DeliveryResult> {
    if (!request.toEmail) {
      throw new Error('Recipient email is required');
    }

    const digest = createHash('sha256')
      .update(`${request.toEmail}|${request.subject}|${request.body}`)
      .digest('hex')
      .slice(0, 24);

    return {
      provider: 'local',
      providerMessageId: `local:${digest}`,
    };
  }
}
