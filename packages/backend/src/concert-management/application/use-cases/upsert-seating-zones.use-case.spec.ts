import type { Mocked } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import type { SeatingZoneRepositoryPort } from '../../domain/ports/seating-zone.port';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';
import type { SeatingMapWriteRepositoryPort } from '../../domain/ports/seating-map-write.port';
import {
  ConcertNotDraftError,
  DuplicateSvgElementIdError,
  InvalidSvgElementIdError,
  SeatingMapRequiredError,
} from '../../domain/seating-map.errors';
import { UpsertSeatingZonesUseCase } from './upsert-seating-zones.use-case';

describe('UpsertSeatingZonesUseCase', () => {
  let authorizeMock: Mocked<AuthorizeConcertManagementUseCase>;
  let seatingZoneRepoMock: Mocked<SeatingZoneRepositoryPort>;
  let concertWriteRepoMock: Mocked<ConcertWriteRepositoryPort>;
  let seatingMapWriteRepoMock: Mocked<SeatingMapWriteRepositoryPort>;
  let useCase: UpsertSeatingZonesUseCase;

  beforeEach(() => {
    authorizeMock = {
      execute: vi.fn(),
    } as any;

    seatingZoneRepoMock = {
      upsertMany: vi.fn(),
    } as any;

    concertWriteRepoMock = {
      findConcertById: vi.fn(),
    } as any;

    seatingMapWriteRepoMock = {
      findAssetById: vi.fn(),
    } as any;

    useCase = new UpsertSeatingZonesUseCase(
      authorizeMock,
      seatingZoneRepoMock,
      concertWriteRepoMock,
      seatingMapWriteRepoMock,
    );
  });

  it('throws ConcertNotDraftError if concert status is not DRAFT', async () => {
    concertWriteRepoMock.findConcertById.mockResolvedValue({
      id: 'concert-1',
      status: 'PUBLISHED',
    } as any);

    await expect(
      useCase.execute({
        concertId: 'concert-1',
        userId: 'user-1',
        allowAdminOverride: false,
        zones: [],
      }),
    ).rejects.toThrow(ConcertNotDraftError);
  });

  it('throws SeatingMapRequiredError if concert has no seatingMapAssetId', async () => {
    concertWriteRepoMock.findConcertById.mockResolvedValue({
      id: 'concert-1',
      status: 'DRAFT',
      seatingMapAssetId: null,
    } as any);

    await expect(
      useCase.execute({
        concertId: 'concert-1',
        userId: 'user-1',
        allowAdminOverride: false,
        zones: [],
      }),
    ).rejects.toThrow(SeatingMapRequiredError);
  });

  it('throws InvalidSvgElementIdError if any SVG element ID is not in the asset metadata', async () => {
    concertWriteRepoMock.findConcertById.mockResolvedValue({
      id: 'concert-1',
      status: 'DRAFT',
      seatingMapAssetId: 'asset-1',
    } as any);

    seatingMapWriteRepoMock.findAssetById.mockResolvedValue({
      id: 'asset-1',
      svgElementIds: ['zone-1', 'zone-2'],
    } as any);

    await expect(
      useCase.execute({
        concertId: 'concert-1',
        userId: 'user-1',
        allowAdminOverride: false,
        zones: [
          { svgElementId: 'zone-1', label: 'Zone 1', color: '#fff', displayOrder: 1, status: 'ACTIVE' },
          { svgElementId: 'zone-3', label: 'Zone 3', color: '#000', displayOrder: 3, status: 'ACTIVE' },
        ],
      }),
    ).rejects.toThrow(InvalidSvgElementIdError);
  });

  it('throws DuplicateSvgElementIdError if duplicate SVG element IDs are provided', async () => {
    concertWriteRepoMock.findConcertById.mockResolvedValue({
      id: 'concert-1',
      status: 'DRAFT',
      seatingMapAssetId: 'asset-1',
    } as any);

    seatingMapWriteRepoMock.findAssetById.mockResolvedValue({
      id: 'asset-1',
      svgElementIds: ['zone-1'],
    } as any);

    await expect(
      useCase.execute({
        concertId: 'concert-1',
        userId: 'user-1',
        allowAdminOverride: false,
        zones: [
          { svgElementId: 'zone-1', label: 'Zone 1', color: '#fff', displayOrder: 1, status: 'ACTIVE' },
          { svgElementId: 'zone-1', label: 'Zone 1.5', color: '#ccc', displayOrder: 2, status: 'ACTIVE' },
        ],
      }),
    ).rejects.toThrow(DuplicateSvgElementIdError);
  });

  it('successfully upserts seating zones', async () => {
    concertWriteRepoMock.findConcertById.mockResolvedValue({
      id: 'concert-1',
      status: 'DRAFT',
      seatingMapAssetId: 'asset-1',
    } as any);

    seatingMapWriteRepoMock.findAssetById.mockResolvedValue({
      id: 'asset-1',
      svgElementIds: ['zone-1', 'zone-2'],
    } as any);

    const upsertedZones = [{ id: 'z1', svgElementId: 'zone-1' }];
    seatingZoneRepoMock.upsertMany.mockResolvedValue(upsertedZones as any);

    const result = await useCase.execute({
      concertId: 'concert-1',
      userId: 'user-1',
      allowAdminOverride: false,
      zones: [{ svgElementId: 'zone-1', label: 'Zone 1', color: '#fff', displayOrder: 1, status: 'ACTIVE' }],
    });

    expect(result.zones).toBe(upsertedZones);
    expect(seatingZoneRepoMock.upsertMany).toHaveBeenCalledWith('concert-1', [
      { svgElementId: 'zone-1', label: 'Zone 1', color: '#fff', displayOrder: 1, status: 'ACTIVE' },
    ]);
  });
});
