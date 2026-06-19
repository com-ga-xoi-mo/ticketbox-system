import { TicketNotFoundError } from '../../domain/errors';
import { QrTicketTokenService } from '../../domain/qr-ticket-token.service';
import type { TicketDetail } from '../../domain/ticket-read.model';
import type { TicketRepositoryPort } from '../../domain/ports/ticket-repository.port';

export interface GetUserTicketCommand {
  userId: string;
  ticketId: string;
}

export class GetUserTicketUseCase {
  constructor(
    private readonly ticketRepository: TicketRepositoryPort,
    private readonly qrTicketTokenService: QrTicketTokenService,
  ) {}

  async execute(command: GetUserTicketCommand): Promise<TicketDetail> {
    const ticket = await this.ticketRepository.findByUserIdAndId(
      command.userId,
      command.ticketId,
    );

    if (!ticket) {
      throw new TicketNotFoundError(command.ticketId);
    }

    return {
      ...ticket,
      qrPayload: this.qrTicketTokenService.createPayload({
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        orderId: ticket.orderId,
        userId: ticket.userId,
        concertId: ticket.concertId,
        issuedAt: ticket.issuedAt,
      }),
    };
  }
}
