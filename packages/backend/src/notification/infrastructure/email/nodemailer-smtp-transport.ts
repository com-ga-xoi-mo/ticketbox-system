import nodemailer, { type Transporter } from 'nodemailer';

import type { SmtpEmailMessage, SmtpEmailTransport } from './smtp-email-channel.adapter';

export interface NodemailerSmtpTransportOptions {
  host: string;
  port: number;
  /** true → implicit TLS (port 465); false → STARTTLS upgrade (port 587). */
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

/**
 * Authenticated, TLS-capable SMTP transport built on nodemailer. Used for real
 * providers (e.g. Gmail) that require STARTTLS/TLS and AUTH, which the plaintext
 * socket transport does not support.
 */
export class NodemailerSmtpTransport implements SmtpEmailTransport {
  private readonly transporter: Pick<Transporter, 'sendMail'>;

  constructor(
    options: NodemailerSmtpTransportOptions,
    transporter?: Pick<Transporter, 'sendMail'>,
  ) {
    this.transporter =
      transporter ??
      nodemailer.createTransport({
        host: options.host,
        port: options.port,
        secure: options.secure,
        ...(options.auth ? { auth: options.auth } : {}),
      });
  }

  async send(message: SmtpEmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: message.from,
      to: message.to,
      subject: message.subject,
      text: message.body,
      attachments: message.attachments?.map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        content: attachment.content,
        ...(attachment.contentId ? { cid: attachment.contentId } : {}),
      })),
    });
  }
}
