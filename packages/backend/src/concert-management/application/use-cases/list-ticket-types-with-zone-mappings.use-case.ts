import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { Role } from '../../../identity/domain/role.enum';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';
import type { TicketTypeZoneRepositoryPort } from '../../domain/ports/ticket-type-zone.port';
import type { TicketType } from '../../domain/concert.types';
import type { SeatingZone } from '../../domain/seating-map.types';

export interface ListTicketTypesWithZoneMappingsInput {
  concertId: string;
  userId: string;
  allowAdminOverride: boolean;
}

export interface TicketTypeWithZoneMappings extends TicketType {
  mappedZones: Array<{
    seatingZoneId: string;
    svgElementId: string;
    label: string;
  }>;
}

export class ListTicketTypesWithZoneMappingsUseCase {
  constructor(
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
    private readonly concertWriteRepo: ConcertWriteRepositoryPort,
    private readonly ticketTypeZoneRepo: TicketTypeZoneRepositoryPort,
  ) {}

  async execute(input: ListTicketTypesWithZoneMappingsInput): Promise<TicketTypeWithZoneMappings[]> {
    await this.authorizeConcertManagement.execute({
      actor: {
        userId: input.userId,
        roles: [input.allowAdminOverride ? Role.ADMIN : Role.ORGANIZER],
      },
      concertId: input.concertId,
      allowAdminOverride: input.allowAdminOverride,
    });

    const ticketTypes = await this.concertWriteRepo.findTicketTypesByConcertId(input.concertId);
    
    const result: TicketTypeWithZoneMappings[] = [];
    
    for (const tt of ticketTypes) {
      const zones = await this.ticketTypeZoneRepo.findByTicketTypeId(tt.id);
      result.push({
        ...tt,
        mappedZones: zones.map(z => ({
          seatingZoneId: z.id,
          svgElementId: z.svgElementId,
          label: z.label,
        })),
      });
    }

    return result;
  }
}
