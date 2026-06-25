import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { Role } from '../../../identity/domain/role.enum';
import type { SeatingZoneRepositoryPort } from '../../domain/ports/seating-zone.port';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';
import type { SeatingMapWriteRepositoryPort } from '../../domain/ports/seating-map-write.port';
import {
  DuplicateSvgElementIdError,
  SeatingMapRequiredError,
  InvalidSvgElementIdError,
  ConcertNotDraftError,
} from '../../domain/seating-map.errors';
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
    private readonly concertWriteRepo: ConcertWriteRepositoryPort,
    private readonly seatingMapWriteRepo: SeatingMapWriteRepositoryPort,
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

    const concert = await this.concertWriteRepo.findConcertById(cmd.concertId);
    if (!concert || concert.status !== 'DRAFT') {
      throw new ConcertNotDraftError();
    }

    if (!concert.seatingMapAssetId) {
      throw new SeatingMapRequiredError();
    }

    const seatingMapAsset = await this.seatingMapWriteRepo.findAssetById(concert.seatingMapAssetId);
    if (!seatingMapAsset) {
      throw new SeatingMapRequiredError();
    }

    const validSvgElementIds = new Set(seatingMapAsset.svgElementIds);
    const invalidIds: string[] = [];

    const seen = new Set<string>();
    for (const zone of cmd.zones) {
      if (seen.has(zone.svgElementId)) {
        throw new DuplicateSvgElementIdError(zone.svgElementId);
      }
      seen.add(zone.svgElementId);

      if (!validSvgElementIds.has(zone.svgElementId)) {
        invalidIds.push(zone.svgElementId);
      }
    }

    if (invalidIds.length > 0) {
      throw new InvalidSvgElementIdError(invalidIds);
    }

    return {
      zones: await this.seatingZoneRepo.upsertMany(cmd.concertId, cmd.zones),
    };
  }
}
