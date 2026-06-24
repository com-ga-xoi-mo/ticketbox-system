import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { Role } from '../../../identity/domain/role.enum';
import type { SeatingZoneRepositoryPort } from '../../domain/ports/seating-zone.port';
import type { SeatingZone } from '../../domain/seating-map.types';

export interface ListSeatingZonesInput {
  concertId: string;
  userId: string;
  allowAdminOverride: boolean;
}

export class ListSeatingZonesUseCase {
  constructor(
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
    private readonly seatingZoneRepo: SeatingZoneRepositoryPort,
  ) {}

  async execute(input: ListSeatingZonesInput): Promise<SeatingZone[]> {
    await this.authorizeConcertManagement.execute({
      actor: {
        userId: input.userId,
        roles: [input.allowAdminOverride ? Role.ADMIN : Role.ORGANIZER],
      },
      concertId: input.concertId,
      allowAdminOverride: input.allowAdminOverride,
    });

    return this.seatingZoneRepo.findByConcertId(input.concertId);
  }
}
