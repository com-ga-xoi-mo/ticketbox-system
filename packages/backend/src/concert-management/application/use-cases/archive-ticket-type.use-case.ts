import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import type { TicketType } from '../../domain/concert.types';
import { TicketTypeHasSoldTicketsError, TicketTypeNotFoundError } from '../../domain/errors';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';
import type { ArchiveTicketTypeCommand } from './commands';

export class ArchiveTicketTypeUseCase {
  constructor(
    private readonly concertWriteRepo: ConcertWriteRepositoryPort,
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
  ) {}

  async execute(cmd: ArchiveTicketTypeCommand): Promise<TicketType> {
    const actor = {
      userId: cmd.requesterId,
      roles: [cmd.requesterRole],
    };

    await this.authorizeConcertManagement.execute({
      actor,
      concertId: cmd.concertId,
      allowAdminOverride: cmd.allowAdminOverride,
    });

    const existingTypes = await this.concertWriteRepo.findTicketTypesByConcertId(cmd.concertId);
    const ticketType = existingTypes.find((t) => t.id === cmd.ticketTypeId);
    if (!ticketType) {
      throw new TicketTypeNotFoundError(cmd.ticketTypeId);
    }

    if (ticketType.soldQuantity + ticketType.reservedQuantity > 0) {
      throw new TicketTypeHasSoldTicketsError();
    }

    return this.concertWriteRepo.archiveTicketType(cmd.ticketTypeId);
  }
}
