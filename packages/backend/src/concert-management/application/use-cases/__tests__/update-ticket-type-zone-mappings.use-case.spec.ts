import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthorizeConcertManagementUseCase } from '../../../../identity/application/use-cases/authorize-concert-management.use-case';
import type { ConcertWriteRepositoryPort } from '../../../domain/ports/concert-write.port';
import type { SeatingZoneRepositoryPort } from '../../../domain/ports/seating-zone.port';
import type { TicketTypeZoneRepositoryPort } from '../../../domain/ports/ticket-type-zone.port';
import { CrossConcertZoneMappingError } from '../../../domain/seating-map.errors';
import type { SeatingZone } from '../../../domain/seating-map.types';
import { UpdateTicketTypeZoneMappingsUseCase } from '../update-ticket-type-zone-mappings.use-case';

const now = new Date();
const zone = (id: string, concertId = 'concert-1'): SeatingZone => ({
  id,
  concertId,
  svgElementId: id,
  label: id.toUpperCase(),
  color: null,
  displayOrder: 1,
  status: 'ACTIVE',
  createdAt: now,
  updatedAt: now,
});

describe('UpdateTicketTypeZoneMappingsUseCase', () => {
  let seatingZoneRepo: SeatingZoneRepositoryPort;
  let ticketTypeZoneRepo: TicketTypeZoneRepositoryPort;
  let useCase: UpdateTicketTypeZoneMappingsUseCase;
  const zones = [zone('zone-1'), zone('zone-2'), zone('other-zone', 'other-concert')];

  beforeEach(() => {
    const concertWriteRepo = {
      findTicketTypesByConcertId: vi.fn(async () => [
        { id: 'type-1', concertId: 'concert-1' },
        { id: 'type-2', concertId: 'concert-1' },
      ]),
    } as unknown as ConcertWriteRepositoryPort;
    seatingZoneRepo = {
      upsertMany: vi.fn(),
      findByConcertId: vi.fn(),
      findByIds: vi.fn(async (ids) => zones.filter((candidate) => ids.includes(candidate.id))),
    };
    ticketTypeZoneRepo = {
      replaceForTicketType: vi.fn(async (_concertId, _ticketTypeId, seatingZoneIds) =>
        zones.filter((candidate) => seatingZoneIds.includes(candidate.id)),
      ),
      findByTicketTypeId: vi.fn(),
    };
    useCase = new UpdateTicketTypeZoneMappingsUseCase(
      { execute: vi.fn().mockResolvedValue(undefined) } as unknown as AuthorizeConcertManagementUseCase,
      concertWriteRepo,
      seatingZoneRepo,
      ticketTypeZoneRepo,
    );
  });

  it('maps a ticket type to one or many zones', async () => {
    const one = await useCase.execute({
      concertId: 'concert-1',
      ticketTypeId: 'type-1',
      userId: 'organizer-1',
      allowAdminOverride: false,
      seatingZoneIds: ['zone-1'],
    });
    const many = await useCase.execute({
      concertId: 'concert-1',
      ticketTypeId: 'type-2',
      userId: 'organizer-1',
      allowAdminOverride: false,
      seatingZoneIds: ['zone-1', 'zone-2'],
    });

    expect(one.mappedZones).toHaveLength(1);
    expect(many.mappedZones).toHaveLength(2);
  });

  it('rejects cross-concert mapping and ticket types outside the concert', async () => {
    await expect(
      useCase.execute({
        concertId: 'concert-1',
        ticketTypeId: 'type-1',
        userId: 'organizer-1',
        allowAdminOverride: false,
        seatingZoneIds: ['other-zone'],
      }),
    ).rejects.toThrow(CrossConcertZoneMappingError);

    await expect(
      useCase.execute({
        concertId: 'concert-1',
        ticketTypeId: 'missing-type',
        userId: 'organizer-1',
        allowAdminOverride: false,
        seatingZoneIds: ['zone-1'],
      }),
    ).rejects.toThrow(CrossConcertZoneMappingError);
  });

  it('clears mappings when seatingZoneIds is empty', async () => {
    const result = await useCase.execute({
      concertId: 'concert-1',
      ticketTypeId: 'type-1',
      userId: 'organizer-1',
      allowAdminOverride: false,
      seatingZoneIds: [],
    });

    expect(result.mappedZones).toEqual([]);
    expect(ticketTypeZoneRepo.replaceForTicketType).toHaveBeenCalledWith('concert-1', 'type-1', []);
  });
});
