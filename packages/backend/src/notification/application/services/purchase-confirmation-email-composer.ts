import type { QrTicketTokenService } from '../../../ordering/domain/qr-ticket-token.service';
import type { DeliveryAttachment } from '../../domain/notification.types';
import type { PurchaseConfirmationTicketReadPort } from '../../domain/ports/purchase-confirmation-ticket-read.port';
import type { QrImageRendererPort } from '../../domain/ports/qr-image-renderer.port';

export interface PurchaseConfirmationEmailContent {
  body: string;
  attachments: DeliveryAttachment[];
}

export class PurchaseConfirmationEmailComposer {
  constructor(
    private readonly ticketReadPort: PurchaseConfirmationTicketReadPort,
    private readonly qrTicketTokenService: QrTicketTokenService,
    private readonly qrImageRenderer: QrImageRendererPort,
  ) {}

  async compose(orderId: string, baseBody: string): Promise<PurchaseConfirmationEmailContent> {
    const tickets = await this.ticketReadPort.findIssuedTicketsByPaidOrderId(orderId);
    if (tickets.length === 0) {
      throw new Error(`No issued tickets found for purchase confirmation order ${orderId}`);
    }

    const attachments: DeliveryAttachment[] = [];
    const ticketLines: string[] = ['', 'Issued e-tickets:'];

    for (const ticket of tickets) {
      const qrPayload = this.qrTicketTokenService.createPayload({
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        orderId: ticket.orderId,
        userId: ticket.userId,
        concertId: ticket.concertId,
        issuedAt: ticket.issuedAt,
      });
      const content = await this.qrImageRenderer.renderPng(qrPayload);
      const safeTicketNumber = sanitizeFilenamePart(ticket.ticketNumber);

      attachments.push({
        filename: `${safeTicketNumber}.png`,
        contentType: 'image/png',
        content,
        contentId: `ticket-${ticket.id}@ticketbox`,
      });
      ticketLines.push(
        `${ticket.ticketNumber} | ${ticket.ticketTypeName} | ${ticket.concertTitle} | ${ticket.concertStartsAt.toISOString()}`,
      );
    }

    return {
      body: `${baseBody}${ticketLines.join('\n')}`,
      attachments,
    };
  }
}

function sanitizeFilenamePart(value: string): string {
  const sanitized = value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return sanitized || 'ticket';
}
