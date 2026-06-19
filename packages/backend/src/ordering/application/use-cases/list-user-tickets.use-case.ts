import type { TicketSummary } from '../../domain/ticket-read.model';
import type { TicketRepositoryPort } from '../../domain/ports/ticket-repository.port';

export interface ListUserTicketsCommand {
  userId: string;
}

export class ListUserTicketsUseCase {
  constructor(private readonly ticketRepository: TicketRepositoryPort) {}

  async execute(command: ListUserTicketsCommand): Promise<TicketSummary[]> {
    return this.ticketRepository.findByUserId(command.userId);
  }
}
