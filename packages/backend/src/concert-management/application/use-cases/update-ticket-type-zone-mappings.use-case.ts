import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { Role } from '../../../identity/domain/role.enum';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';
import type { SeatingZoneRepositoryPort } from '../../domain/ports/seating-zone.port';
import type { TicketTypeZoneRepositoryPort } from '../../domain/ports/ticket-type-zone.port';
import { CrossConcertZoneMappingError } from '../../domain/seating-map.errors';
import type {
  TicketTypeZoneMappingResult,
  UpdateTicketTypeZoneMappingsInput,
} from '../../domain/seating-map.types';

export class UpdateTicketTypeZoneMappingsUseCase {
  constructor(
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
    private readonly concertWriteRepo: ConcertWriteRepositoryPort,
    private readonly seatingZoneRepo: SeatingZoneRepositoryPort,
    private readonly ticketTypeZoneRepo: TicketTypeZoneRepositoryPort,
  ) {}

  async execute(input: UpdateTicketTypeZoneMappingsInput): Promise<TicketTypeZoneMappingResult> {
    await this.authorizeConcertManagement.execute({
      actor: {
        userId: input.userId,
        roles: [input.allowAdminOverride ? Role.ADMIN : Role.ORGANIZER],
      },
      concertId: input.concertId,
      allowAdminOverride: input.allowAdminOverride,
    });

    const ticketTypes = await this.concertWriteRepo.findTicketTypesByConcertId(input.concertId);
    if (!ticketTypes.some((ticketType) => ticketType.id === input.ticketTypeId)) {
      throw new CrossConcertZoneMappingError();
    }

    const uniqueZoneIds = Array.from(new Set(input.seatingZoneIds));
    const zones = uniqueZoneIds.length > 0 ? await this.seatingZoneRepo.findByIds(uniqueZoneIds) : [];
    if (
      zones.length !== uniqueZoneIds.length ||
      zones.some((zone) => zone.concertId !== input.concertId)
    ) {
      throw new CrossConcertZoneMappingError();
    }

    const mappedZones = await this.ticketTypeZoneRepo.replaceForTicketType(
      input.concertId,
      input.ticketTypeId,
      uniqueZoneIds,
    );

    return {
      ticketTypeId: input.ticketTypeId,
      mappedZones: mappedZones.map((zone) => ({
        seatingZoneId: zone.id,
        svgElementId: zone.svgElementId,
        label: zone.label,
      })),
    };
  }
}
