import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { Role } from '../../../identity/domain/role.enum';
import { ForbiddenConcertOwnershipError, ConcertNotFoundError } from '../../../identity/domain/errors';
import { GetSeatingMapUseCase } from './get-seating-map.use-case';
import { ListSeatingZonesUseCase } from './list-seating-zones.use-case';
import { ListTicketTypesWithZoneMappingsUseCase } from './list-ticket-types-with-zone-mappings.use-case';

describe('Read Seating Map Data Use Cases', () => {
  let authorize: any;
  let concertRepo: any;
  let seatingMapRepo: any;
  let zoneRepo: any;
  let ticketTypeZoneRepo: any;

  let getSeatingMap: GetSeatingMapUseCase;
  let listSeatingZones: ListSeatingZonesUseCase;
  let listTicketTypes: ListTicketTypesWithZoneMappingsUseCase;

  beforeEach(() => {
    authorize = { execute: vi.fn() };
    concertRepo = { findConcertById: vi.fn(), findTicketTypesByConcertId: vi.fn() };
    seatingMapRepo = { findAssetById: vi.fn() };
    zoneRepo = { findByConcertId: vi.fn() };
    ticketTypeZoneRepo = { findByTicketTypeId: vi.fn() };

    getSeatingMap = new GetSeatingMapUseCase(authorize, concertRepo, seatingMapRepo);
    listSeatingZones = new ListSeatingZonesUseCase(authorize, zoneRepo);
    listTicketTypes = new ListTicketTypesWithZoneMappingsUseCase(authorize, concertRepo, ticketTypeZoneRepo);
  });

  describe('GetSeatingMapUseCase', () => {
    it('should return assetId and svgElementIds for successful admin read', async () => {
      concertRepo.findConcertById.mockResolvedValue({ id: 'c1', seatingMapAssetId: 'a1' });
      seatingMapRepo.findAssetById.mockResolvedValue({ svgElementIds: ['path1'] });

      const result = await getSeatingMap.execute({ concertId: 'c1', userId: 'admin1', allowAdminOverride: true });
      
      expect(authorize.execute).toHaveBeenCalledWith({
        actor: { userId: 'admin1', roles: [Role.ADMIN] },
        concertId: 'c1',
        allowAdminOverride: true,
      });
      expect(result).toEqual({ assetId: 'a1', svgElementIds: ['path1'], svgUrl: null });
    });

    it('should return successful organizer-owned read', async () => {
      concertRepo.findConcertById.mockResolvedValue({ id: 'c1', seatingMapAssetId: 'a1' });
      seatingMapRepo.findAssetById.mockResolvedValue({ svgElementIds: ['path1'] });

      const result = await getSeatingMap.execute({ concertId: 'c1', userId: 'org1', allowAdminOverride: false });
      
      expect(authorize.execute).toHaveBeenCalledWith({
        actor: { userId: 'org1', roles: [Role.ORGANIZER] },
        concertId: 'c1',
        allowAdminOverride: false,
      });
      expect(result).toEqual({ assetId: 'a1', svgElementIds: ['path1'], svgUrl: null });
    });

    it('should return empty seating-map metadata when authorized concert has no seating map asset', async () => {
      concertRepo.findConcertById.mockResolvedValue({ id: 'c1', seatingMapAssetId: null });

      const result = await getSeatingMap.execute({ concertId: 'c1', userId: 'admin1', allowAdminOverride: true });
      expect(result).toEqual({ assetId: null, svgElementIds: [], svgUrl: null });
    });

    it('should throw ConcertNotFoundError if concert not found', async () => {
      concertRepo.findConcertById.mockResolvedValue(null);
      await expect(getSeatingMap.execute({ concertId: 'c1', userId: 'admin1', allowAdminOverride: true }))
        .rejects.toThrow(ConcertNotFoundError);
    });

    it('should throw ForbiddenConcertOwnershipError if organizer forbidden', async () => {
      authorize.execute.mockRejectedValue(new ForbiddenConcertOwnershipError('c1'));
      await expect(getSeatingMap.execute({ concertId: 'c1', userId: 'org1', allowAdminOverride: false }))
        .rejects.toThrow(ForbiddenConcertOwnershipError);
    });
  });

  describe('ListSeatingZonesUseCase', () => {
    it('should return zones on successful read', async () => {
      zoneRepo.findByConcertId.mockResolvedValue([{ id: 'z1' }]);
      const result = await listSeatingZones.execute({ concertId: 'c1', userId: 'admin1', allowAdminOverride: true });
      expect(result).toEqual([{ id: 'z1' }]);
    });
  });

  describe('ListTicketTypesWithZoneMappingsUseCase', () => {
    it('should return ticket types with mapped zones on successful read', async () => {
      concertRepo.findTicketTypesByConcertId.mockResolvedValue([{ id: 't1' }]);
      ticketTypeZoneRepo.findByTicketTypeId.mockResolvedValue([{ id: 'z1', svgElementId: 'path1', label: 'VIP' }]);

      const result = await listTicketTypes.execute({ concertId: 'c1', userId: 'admin1', allowAdminOverride: true });
      expect(result).toEqual([{
        id: 't1',
        mappedZones: [{ seatingZoneId: 'z1', svgElementId: 'path1', label: 'VIP' }],
      }]);
    });
  });
});
