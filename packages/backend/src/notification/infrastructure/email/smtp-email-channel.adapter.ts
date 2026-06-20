import { Socket } from 'node:net';

import type { NotificationChannelPort } from '../../domain/ports/notification-channel.port';
import type { DeliveryRequest, DeliveryResult } from '../../domain/notification.types';

export interface SmtpEmailMessage {
  from: string;
  to: string;
  subject: string;
  body: string;
}

export interface SmtpEmailTransport {
  send(message: SmtpEmailMessage): Promise<void>;
}

interface SmtpSocketTransportOptions {
  host: string;
  port: number;
}

export class SmtpSocketTransport implements SmtpEmailTransport {
  constructor(private readonly options: SmtpSocketTransportOptions) {}

  async send(message: SmtpEmailMessage): Promise<void> {
    const client = new SimpleSmtpClient(this.options.host, this.options.port);
    await client.send(message);
  }
}

export class SmtpEmailChannelAdapter implements NotificationChannelPort {
  constructor(
    private readonly from: string,
    private readonly transport: SmtpEmailTransport,
  ) {}

  async send(request: DeliveryRequest): Promise<DeliveryResult> {
    if (!request.toEmail) {
      throw new Error('Recipient email is required');
    }

    await this.transport.send({
      from: this.from,
      to: request.toEmail,
      subject: request.subject,
      body: request.body,
    });

    return {
      provider: 'smtp',
      providerMessageId: `smtp:${request.notificationId}`,
    };
  }
}

class SimpleSmtpClient {
  private socket: Socket | null = null;
  private buffer = '';
  private pending:
    | {
        resolve: (line: string) => void;
        reject: (error: Error) => void;
      }
    | null = null;

  constructor(
    private readonly host: string,
    private readonly port: number,
  ) {}

  async send(message: SmtpEmailMessage): Promise<void> {
    await this.connect();

    try {
      await this.expect([220]);
      await this.command('EHLO ticketbox.local', [250]);
      await this.command(`MAIL FROM:<${message.from}>`, [250]);
      await this.command(`RCPT TO:<${message.to}>`, [250, 251]);
      await this.command('DATA', [354]);
      await this.command(this.formatMessage(message), [250]);
      await this.command('QUIT', [221]);
    } finally {
      this.socket?.end();
      this.socket = null;
    }
  }

  private async connect(): Promise<void> {
    this.socket = new Socket();
    this.socket.setEncoding('utf8');
    this.socket.on('data', (chunk: string) => {
      this.buffer += chunk;
      this.flushLine();
    });
    this.socket.on('error', (error) => {
      this.pending?.reject(error);
      this.pending = null;
    });

    await new Promise<void>((resolve, reject) => {
      this.socket?.once('connect', resolve);
      this.socket?.once('error', reject);
      this.socket?.connect(this.port, this.host);
    });
  }

  private async command(payload: string, acceptedCodes: number[]): Promise<string> {
    this.socket?.write(`${payload}\r\n`);
    return this.expect(acceptedCodes);
  }

  private async expect(acceptedCodes: number[]): Promise<string> {
    const line = await this.readResponseLine();
    const code = Number(line.slice(0, 3));
    if (!acceptedCodes.includes(code)) {
      throw new Error(`SMTP command failed: ${line}`);
    }
    return line;
  }

  private readResponseLine(): Promise<string> {
    this.flushLine();

    if (this.pending) {
      throw new Error('SMTP client attempted concurrent reads');
    }

    return new Promise<string>((resolve, reject) => {
      this.pending = { resolve, reject };
      this.flushLine();
    });
  }

  private flushLine(): void {
    if (!this.pending) return;

    const lineEnd = this.buffer.indexOf('\n');
    if (lineEnd === -1) return;

    const rawLine = this.buffer.slice(0, lineEnd + 1);
    this.buffer = this.buffer.slice(lineEnd + 1);

    if (rawLine.length >= 4 && rawLine[3] === '-') {
      this.flushLine();
      return;
    }

    const line = rawLine.trimEnd();
    const pending = this.pending;
    this.pending = null;
    pending.resolve(line);
  }

  private formatMessage(message: SmtpEmailMessage): string {
    return [
      `From: ${message.from}`,
      `To: ${message.to}`,
      `Subject: ${sanitizeHeader(message.subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      message.body.replace(/\r?\n\./g, '\n..'),
      '.',
    ].join('\r\n');
  }
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}
