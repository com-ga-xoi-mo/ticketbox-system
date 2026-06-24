import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { Role } from '../../../identity/domain/role.enum';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';
import type { SeatingMapWriteRepositoryPort } from '../../domain/ports/seating-map-write.port';
import { ConcertNotFoundError } from '../../../identity/domain/errors';

export interface GetSeatingMapInput {
  concertId: string;
  userId: string;
  allowAdminOverride: boolean;
}

export interface GetSeatingMapResult {
  assetId: string | null;
  svgUrl: string | null;
  svgElementIds: string[];
}

export class GetSeatingMapUseCase {
  constructor(
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
    private readonly concertWriteRepo: ConcertWriteRepositoryPort,
    private readonly seatingMapWriteRepo: SeatingMapWriteRepositoryPort,
  ) {}

  async execute(input: GetSeatingMapInput): Promise<GetSeatingMapResult> {
    await this.authorizeConcertManagement.execute({
      actor: {
        userId: input.userId,
        roles: [input.allowAdminOverride ? Role.ADMIN : Role.ORGANIZER],
      },
      concertId: input.concertId,
      allowAdminOverride: input.allowAdminOverride,
    });

    const concert = await this.concertWriteRepo.findConcertById(input.concertId);
    if (!concert) {
      throw new ConcertNotFoundError(input.concertId);
    }

    if (!concert.seatingMapAssetId) {
      return {
        assetId: null,
        svgUrl: null,
        svgElementIds: [],
      };
    }

    const asset = await this.seatingMapWriteRepo.findAssetById(concert.seatingMapAssetId);

    return {
      assetId: concert.seatingMapAssetId,
      svgUrl: asset?.publicUrl ?? null,
      svgElementIds: asset?.svgElementIds ?? [],
    };
  }
}
