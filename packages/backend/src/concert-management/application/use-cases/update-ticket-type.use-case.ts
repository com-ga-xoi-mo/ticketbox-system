import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import type { TicketType } from '../../domain/concert.types';
import {
  InvalidSalePeriodError,
  InvalidTicketPriceError,
  InvalidTicketQuantityError,
  TicketTypeCodeAlreadyExistsError,
  TicketTypeNotFoundError,
} from '../../domain/errors';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';
import type { UpdateTicketTypeCommand } from './commands';

export class UpdateTicketTypeUseCase {
  constructor(
    private readonly concertWriteRepo: ConcertWriteRepositoryPort,
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
  ) {}

  async execute(cmd: UpdateTicketTypeCommand): Promise<TicketType> {
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

    if (cmd.priceVnd !== undefined && cmd.priceVnd < 0) {
      throw new InvalidTicketPriceError();
    }

    if (cmd.totalQuantity !== undefined && cmd.totalQuantity < 1) {
      throw new InvalidTicketQuantityError('Total quantity must be greater than or equal to 1');
    }

    if (cmd.saleStartsAt !== undefined || cmd.saleEndsAt !== undefined) {
      const saleStarts = new Date(cmd.saleStartsAt ?? ticketType.saleStartsAt).getTime();
      const saleEnds = new Date(cmd.saleEndsAt ?? ticketType.saleEndsAt).getTime();
      if (saleEnds <= saleStarts) {
        throw new InvalidSalePeriodError();
      }
    }

    if (cmd.totalQuantity !== undefined) {
      const committedQuantity = ticketType.soldQuantity + ticketType.reservedQuantity;
      if (cmd.totalQuantity < committedQuantity) {
        throw new InvalidTicketQuantityError(
          `Cannot decrease total quantity below sold + reserved quantity (${committedQuantity})`,
        );
      }
    }

    if (cmd.code !== undefined) {
      const duplicate = existingTypes.some(
        (t) =>
          t.id !== cmd.ticketTypeId &&
          t.code.toLowerCase() === cmd.code!.toLowerCase() &&
          t.status !== 'ARCHIVED',
      );
      if (duplicate) {
        throw new TicketTypeCodeAlreadyExistsError(cmd.code);
      }
    }

    return this.concertWriteRepo.updateTicketType(cmd.ticketTypeId, {
      code: cmd.code,
      name: cmd.name,
      description: cmd.description,
      priceVnd: cmd.priceVnd,
      totalQuantity: cmd.totalQuantity,
      saleStartsAt: cmd.saleStartsAt,
      saleEndsAt: cmd.saleEndsAt,
      maxPerUser: cmd.maxPerUser,
      status: cmd.status,
    });
  }
}
