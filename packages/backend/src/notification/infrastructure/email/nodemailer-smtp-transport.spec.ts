import { describe, expect, it, vi } from 'vitest';

import { NodemailerSmtpTransport } from './nodemailer-smtp-transport';

describe('NodemailerSmtpTransport', () => {
  it('maps QR attachments to Nodemailer without changing their bytes', async () => {
    const sendMail = vi.fn(async () => ({ messageId: 'message-1' }));
    const transport = new NodemailerSmtpTransport(
      {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: 'sender@example.com', pass: 'app-password' },
      },
      { sendMail },
    );
    const png = Buffer.from('png-bytes');

    await transport.send({
      from: 'sender@example.com',
      to: 'buyer@example.com',
      subject: 'Your tickets',
      body: 'Ticket details',
      attachments: [
        {
          filename: 'TCK-001.png',
          contentType: 'image/png',
          content: png,
          contentId: 'ticket-1@ticketbox',
        },
      ],
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Ticket details',
        attachments: [
          {
            filename: 'TCK-001.png',
            contentType: 'image/png',
            content: png,
            cid: 'ticket-1@ticketbox',
          },
        ],
      }),
    );
  });
});
