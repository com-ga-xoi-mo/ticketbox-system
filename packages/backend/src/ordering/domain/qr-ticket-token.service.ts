import { createHash, createHmac } from 'crypto';

export interface QrTicketTokenInput {
  ticketId: string;
  ticketNumber: string;
  orderId: string;
  userId: string;
  concertId: string;
  issuedAt: Date;
}

interface QrTicketTokenPayload {
  typ: 'ticketbox.ticket';
  v: 1;
  ticketId: string;
  ticketNumber: string;
  orderId: string;
  userId: string;
  concertId: string;
  issuedAt: string;
}

export class QrTicketTokenService {
  constructor(private readonly secret: string) {
    if (!secret) {
      throw new Error('QR ticket token secret is required');
    }
  }

  createPayload(input: QrTicketTokenInput): string {
    const payload: QrTicketTokenPayload = {
      typ: 'ticketbox.ticket',
      v: 1,
      ticketId: input.ticketId,
      ticketNumber: input.ticketNumber,
      orderId: input.orderId,
      userId: input.userId,
      concertId: input.concertId,
      issuedAt: input.issuedAt.toISOString(),
    };
    const encodedPayload = this.base64Url(JSON.stringify(payload));
    const signature = this.sign(encodedPayload);

    return `${encodedPayload}.${signature}`;
  }

  hashPayload(payload: string): string {
    return createHash('sha256').update(payload).digest('hex');
  }

  private sign(encodedPayload: string): string {
    return createHmac('sha256', this.secret).update(encodedPayload).digest('base64url');
  }

  private base64Url(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
  }
}
