import { describe, expect, it } from 'vitest';

import { QrTicketTokenService } from './qr-ticket-token.service';

const input = {
  ticketId: 'ticket-1',
  ticketNumber: 'TCK-001',
  orderId: 'order-1',
  userId: 'user-1',
  concertId: 'concert-1',
  issuedAt: new Date('2026-06-19T00:00:00.000Z'),
};

describe('QrTicketTokenService', () => {
  it('creates deterministic signed payloads for the same ticket input', () => {
    const service = new QrTicketTokenService('secret-1');

    const first = service.createPayload(input);
    const second = service.createPayload(input);

    expect(first).toBe(second);
    expect(first.split('.')).toHaveLength(2);
  });

  it('stores a hash that is not the raw QR payload', () => {
    const service = new QrTicketTokenService('secret-1');
    const payload = service.createPayload(input);
    const hash = service.hashPayload(payload);

    expect(hash).not.toBe(payload);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(service.hashPayload(payload)).toBe(hash);
  });

  it('changes the payload when stable ticket data changes', () => {
    const service = new QrTicketTokenService('secret-1');

    expect(service.createPayload(input)).not.toBe(
      service.createPayload({ ...input, ticketId: 'ticket-2' }),
    );
  });
});
