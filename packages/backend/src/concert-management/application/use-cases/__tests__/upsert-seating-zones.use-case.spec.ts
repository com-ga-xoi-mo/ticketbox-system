import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthorizeConcertManagementUseCase } from '../../../../identity/application/use-cases/authorize-concert-management.use-case';
import type { SeatingZoneRepositoryPort } from '../../../domain/ports/seating-zone.port';
import { DuplicateSvgElementIdError } from '../../../domain/seating-map.errors';
import type { SeatingZone, UpsertSeatingZoneInput } from '../../../domain/seating-map.types';
import { UpsertSeatingZonesUseCase } from '../upsert-seating-zones.use-case';

describe('UpsertSeatingZonesUseCase', () => {
  let zones: SeatingZone[];
  let repo: SeatingZoneRepositoryPort;
  let useCase: UpsertSeatingZonesUseCase;

  beforeEach(() => {
    zones = [];
    const now = new Date();
    repo = {
      upsertMany: vi.fn(async (concertId, inputZones) =>
        inputZones.map((input: UpsertSeatingZoneInput) => {
          let zone = zones.find(
            (existing) =>
              existing.concertId === concertId && existing.svgElementId === input.svgElementId,
          );
          if (!zone) {
            zone = {
              id: `zone-${zones.length + 1}`,
              concertId,
              svgElementId: input.svgElementId,
              label: input.label,
              color: input.color ?? null,
              displayOrder: input.displayOrder,
              status: input.status ?? 'ACTIVE',
              createdAt: now,
              updatedAt: now,
            };
            zones.push(zone);
          } else {
            zone.label = input.label;
            zone.color = input.color ?? null;
            zone.displayOrder = input.displayOrder;
            zone.status = input.status ?? zone.status;
          }
          return zone;
        }),
      ),
      findByConcertId: vi.fn(),
      findByIds: vi.fn(),
    };
    useCase = new UpsertSeatingZonesUseCase(
      { execute: vi.fn().mockResolvedValue(undefined) } as unknown as AuthorizeConcertManagementUseCase,
      repo,
    );
  });

  it('persists zones with svgElementId and defaults status to ACTIVE', async () => {
    const result = await useCase.execute({
      concertId: 'concert-1',
      userId: 'organizer-1',
      allowAdminOverride: false,
      zones: [{ svgElementId: 'vip', label: 'VIP', displayOrder: 1 }],
    });

    expect(result.zones[0]).toMatchObject({ svgElementId: 'vip', status: 'ACTIVE' });
  });

  it('rejects duplicate svgElementId in the same request', async () => {
    await expect(
      useCase.execute({
        concertId: 'concert-1',
        userId: 'organizer-1',
        allowAdminOverride: false,
        zones: [
          { svgElementId: 'vip', label: 'VIP', displayOrder: 1 },
          { svgElementId: 'vip', label: 'VIP 2', displayOrder: 2 },
        ],
      }),
    ).rejects.toThrow(DuplicateSvgElementIdError);
  });

  it('updates existing zones, preserves omitted zones, and supports optional color/status changes', async () => {
    await useCase.execute({
      concertId: 'concert-1',
      userId: 'organizer-1',
      allowAdminOverride: false,
      zones: [
        { svgElementId: 'vip', label: 'VIP', color: '#fff', displayOrder: 1 },
        { svgElementId: 'ga', label: 'GA', displayOrder: 2 },
      ],
    });

    const result = await useCase.execute({
      concertId: 'concert-1',
      userId: 'organizer-1',
      allowAdminOverride: false,
      zones: [{ svgElementId: 'vip', label: 'VIP Updated', displayOrder: 3, status: 'INACTIVE' }],
    });

    expect(result.zones[0]).toMatchObject({
      label: 'VIP Updated',
      color: null,
      displayOrder: 3,
      status: 'INACTIVE',
    });
    expect(zones).toHaveLength(2);
  });
});
