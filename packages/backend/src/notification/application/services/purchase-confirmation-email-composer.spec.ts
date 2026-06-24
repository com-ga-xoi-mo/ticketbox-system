import { describe, expect, it, vi } from 'vitest';

import { QrTicketTokenService } from '../../../ordering/domain/qr-ticket-token.service';
import type { PurchaseConfirmationTicketReadPort } from '../../domain/ports/purchase-confirmation-ticket-read.port';
import type { QrImageRendererPort } from '../../domain/ports/qr-image-renderer.port';
import { PurchaseConfirmationEmailComposer } from './purchase-confirmation-email-composer';

function ticket(id: string, ticketNumber: string) {
  return {
    id,
    ticketNumber,
    orderId: 'order-1',
    userId: 'user-1',
    concertId: 'concert-1',
    concertTitle: 'TicketBox Live',
    concertStartsAt: new Date('2026-07-01T12:00:00.000Z'),
    ticketTypeName: 'VIP',
    issuedAt: new Date('2026-06-24T01:00:00.000Z'),
  };
}

describe('PurchaseConfirmationEmailComposer', () => {
  it('creates one distinct PNG attachment per existing ticket', async () => {
    const readPort: PurchaseConfirmationTicketReadPort = {
      findIssuedTicketsByPaidOrderId: vi.fn(async () => [
        ticket('ticket-1', 'TCK-001'),
        ticket('ticket-2', 'TCK/002'),
      ]),
    };
    const renderedPayloads: string[] = [];
    const renderer: QrImageRendererPort = {
      renderPng: vi.fn(async (payload) => {
        renderedPayloads.push(payload);
        return Buffer.from(`png-${renderedPayloads.length}`);
      }),
    };
    const composer = new PurchaseConfirmationEmailComposer(
      readPort,
      new QrTicketTokenService('test-secret'),
      renderer,
    );

    const result = await composer.compose('order-1', 'Payment confirmed.');

    expect(result.attachments).toHaveLength(2);
    expect(result.attachments.map((attachment) => attachment.filename)).toEqual([
      'TCK-001.png',
      'TCK-002.png',
    ]);
    expect(renderedPayloads[0]).not.toBe(renderedPayloads[1]);
    expect(result.body).toContain('TCK-001 | VIP | TicketBox Live');
    expect(result.body).toContain('TCK/002 | VIP | TicketBox Live');
    expect(JSON.stringify(result.body)).not.toContain('test-secret');
  });

  it('recreates the same payload for retrying the same ticket', async () => {
    const readPort: PurchaseConfirmationTicketReadPort = {
      findIssuedTicketsByPaidOrderId: vi.fn(async () => [ticket('ticket-1', 'TCK-001')]),
    };
    const payloads: string[] = [];
    const renderer: QrImageRendererPort = {
      renderPng: vi.fn(async (payload) => {
        payloads.push(payload);
        return Buffer.from('png');
      }),
    };
    const composer = new PurchaseConfirmationEmailComposer(
      readPort,
      new QrTicketTokenService('test-secret'),
      renderer,
    );

    await composer.compose('order-1', 'Confirmed');
    await composer.compose('order-1', 'Confirmed');

    expect(payloads[0]).toBe(payloads[1]);
  });

  it('fails safely when no issued tickets exist', async () => {
    const composer = new PurchaseConfirmationEmailComposer(
      { findIssuedTicketsByPaidOrderId: vi.fn(async () => []) },
      new QrTicketTokenService('test-secret'),
      { renderPng: vi.fn() },
    );

    await expect(composer.compose('order-1', 'Confirmed')).rejects.toThrow(
      'No issued tickets found',
    );
  });
});
