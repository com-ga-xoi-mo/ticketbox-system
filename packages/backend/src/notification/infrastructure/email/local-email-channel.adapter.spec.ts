import { describe, expect, it } from 'vitest';

import { NotificationChannel } from '../../domain/notification.types';
import { LocalEmailChannelAdapter } from './local-email-channel.adapter';

describe('LocalEmailChannelAdapter', () => {
  it('returns deterministic provider message IDs for the same email content', async () => {
    const adapter = new LocalEmailChannelAdapter();
    const request = {
      notificationId: 'notification-1',
      channel: NotificationChannel.EMAIL,
      toUserId: 'user-1',
      toEmail: 'audience@ticketbox.test',
      subject: 'TicketBox confirmation',
      body: 'Confirmed',
    };

    const first = await adapter.send(request);
    const second = await adapter.send(request);

    expect(first).toEqual(second);
    expect(first.provider).toBe('local');
    expect(first.providerMessageId).toMatch(/^local:/);
  });

  it('rejects requests without recipient email', async () => {
    const adapter = new LocalEmailChannelAdapter();

    await expect(
      adapter.send({
        notificationId: 'notification-1',
        channel: NotificationChannel.EMAIL,
        toUserId: 'user-1',
        subject: 'TicketBox confirmation',
        body: 'Confirmed',
      }),
    ).rejects.toThrow('Recipient email is required');
  });
});
