import { describe, expect, it, vi } from 'vitest';

import { NotificationChannel } from '../../domain/notification.types';
import {
  SmtpEmailChannelAdapter,
  type SmtpEmailMessage,
  type SmtpEmailTransport,
} from './smtp-email-channel.adapter';

describe('SmtpEmailChannelAdapter', () => {
  it('sends notification content through the configured SMTP transport', async () => {
    const sentMessages: SmtpEmailMessage[] = [];
    const transport: SmtpEmailTransport = {
      send: vi.fn(async (message) => {
        sentMessages.push(message);
      }),
    };
    const adapter = new SmtpEmailChannelAdapter(
      'no-reply@ticketbox.test',
      transport,
    );

    const result = await adapter.send({
      notificationId: 'notification-1',
      channel: NotificationChannel.EMAIL,
      toUserId: 'user-1',
      toEmail: 'audience@ticketbox.test',
      subject: 'TicketBox confirmation',
      body: 'View your e-tickets: https://ticketbox.test/me/tickets/order-1',
    });

    expect(transport.send).toHaveBeenCalledOnce();
    expect(sentMessages[0]).toEqual({
      from: 'no-reply@ticketbox.test',
      to: 'audience@ticketbox.test',
      subject: 'TicketBox confirmation',
      body: 'View your e-tickets: https://ticketbox.test/me/tickets/order-1',
    });
    expect(result).toEqual({
      provider: 'smtp',
      providerMessageId: 'smtp:notification-1',
    });
  });

  it('rejects requests without recipient email', async () => {
    const transport: SmtpEmailTransport = { send: vi.fn() };
    const adapter = new SmtpEmailChannelAdapter(
      'no-reply@ticketbox.test',
      transport,
    );

    await expect(
      adapter.send({
        notificationId: 'notification-1',
        channel: NotificationChannel.EMAIL,
        toUserId: 'user-1',
        subject: 'TicketBox confirmation',
        body: 'Confirmed',
      }),
    ).rejects.toThrow('Recipient email is required');
    expect(transport.send).not.toHaveBeenCalled();
  });
});
