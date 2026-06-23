import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { Role } from '../../../identity/domain/role.enum';
import type { SeatingZoneRepositoryPort } from '../../domain/ports/seating-zone.port';
import { DuplicateSvgElementIdError } from '../../domain/seating-map.errors';
import type { SeatingZone, UpsertSeatingZoneInput } from '../../domain/seating-map.types';

export interface UpsertSeatingZonesCommand {
  concertId: string;
  userId: string;
  allowAdminOverride: boolean;
  zones: UpsertSeatingZoneInput[];
}

export class UpsertSeatingZonesUseCase {
  constructor(
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
    private readonly seatingZoneRepo: SeatingZoneRepositoryPort,
  ) {}

  async execute(cmd: UpsertSeatingZonesCommand): Promise<{ zones: SeatingZone[] }> {
    await this.authorizeConcertManagement.execute({
      actor: {
        userId: cmd.userId,
        roles: [cmd.allowAdminOverride ? Role.ADMIN : Role.ORGANIZER],
      },
      concertId: cmd.concertId,
      allowAdminOverride: cmd.allowAdminOverride,
    });

    const seen = new Set<string>();
    for (const zone of cmd.zones) {
      if (seen.has(zone.svgElementId)) {
        throw new DuplicateSvgElementIdError(zone.svgElementId);
      }
      seen.add(zone.svgElementId);
    }

    return {
      zones: await this.seatingZoneRepo.upsertMany(cmd.concertId, cmd.zones),
    };
  }
}
