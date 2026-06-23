import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import type { TicketType } from '../../domain/concert.types';
import {
  InvalidSalePeriodError,
  InvalidTicketPriceError,
  InvalidTicketQuantityError,
  TicketTypeCodeAlreadyExistsError,
} from '../../domain/errors';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';
import type { CreateTicketTypeCommand } from './commands';

export class CreateTicketTypeUseCase {
  constructor(
    private readonly concertWriteRepo: ConcertWriteRepositoryPort,
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
  ) {}

  async execute(cmd: CreateTicketTypeCommand): Promise<TicketType> {
    const actor = {
      userId: cmd.requesterId,
      roles: [cmd.requesterRole],
    };

    await this.authorizeConcertManagement.execute({
      actor,
      concertId: cmd.concertId,
      allowAdminOverride: cmd.allowAdminOverride,
    });

    if (cmd.priceVnd < 0) {
      throw new InvalidTicketPriceError();
    }

    if (cmd.totalQuantity < 1) {
      throw new InvalidTicketQuantityError('Total quantity must be greater than or equal to 1');
    }

    const saleStarts = new Date(cmd.saleStartsAt).getTime();
    const saleEnds = new Date(cmd.saleEndsAt).getTime();
    if (saleEnds <= saleStarts) {
      throw new InvalidSalePeriodError();
    }

    const existingTypes = await this.concertWriteRepo.findTicketTypesByConcertId(cmd.concertId);
    const duplicate = existingTypes.some(
      (t) => t.code.toLowerCase() === cmd.code.toLowerCase() && t.status !== 'ARCHIVED',
    );
    if (duplicate) {
      throw new TicketTypeCodeAlreadyExistsError(cmd.code);
    }

    return this.concertWriteRepo.createTicketType({
      concertId: cmd.concertId,
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
