import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AdminConcertController } from './admin-concert.controller';
import { OrganizerSeatingMapController } from './organizer-seating-map.controller';
import { OrganizerTicketTypeController } from './organizer-ticket-type.controller';
import { ForbiddenConcertOwnershipError, ConcertNotFoundError } from '../../../identity/domain/errors';

describe('Read Seating Map Data Controllers', () => {
  let adminController: AdminConcertController;
  let orgSeatingMapController: OrganizerSeatingMapController;
  let orgTicketTypeController: OrganizerTicketTypeController;

  let getSeatingMapUseCase: any;
  let listSeatingZonesUseCase: any;
  let listTicketTypesUseCase: any;

  beforeEach(() => {
    getSeatingMapUseCase = { execute: vi.fn() };
    listSeatingZonesUseCase = { execute: vi.fn() };
    listTicketTypesUseCase = { execute: vi.fn() };

    adminController = new AdminConcertController(
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      getSeatingMapUseCase,
      listSeatingZonesUseCase,
      listTicketTypesUseCase
    );

    orgSeatingMapController = new OrganizerSeatingMapController(
      {} as any, {} as any, {} as any,
      getSeatingMapUseCase,
      listSeatingZonesUseCase
    );

    orgTicketTypeController = new OrganizerTicketTypeController(
      {} as any, {} as any, {} as any,
      listTicketTypesUseCase
    );
  });

  describe('Admin Routes', () => {
    it('GET /seating-map', async () => {
      getSeatingMapUseCase.execute.mockResolvedValue({ assetId: 'a1', svgElementIds: [] });
      const result = await adminController.getSeatingMap('c1', { user: { id: 'admin1', roles: [] } as any });
      expect(result).toEqual({ assetId: 'a1', svgElementIds: [] });
    });

    it('GET /seating-zones', async () => {
      listSeatingZonesUseCase.execute.mockResolvedValue([]);
      const result = await adminController.getSeatingZones('c1', { user: { id: 'admin1', roles: [] } as any });
      expect(result).toEqual([]);
    });

    it('GET /ticket-types', async () => {
      listTicketTypesUseCase.execute.mockResolvedValue([]);
      const result = await adminController.getTicketTypes('c1', { user: { id: 'admin1', roles: [] } as any });
      expect(result).toEqual([]);
    });

    it('should map ConcertNotFoundError to NotFoundException', async () => {
      getSeatingMapUseCase.execute.mockRejectedValue(new ConcertNotFoundError('c1'));
      await expect(adminController.getSeatingMap('c1', { user: { id: 'admin1', roles: [] } as any }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('Organizer Routes', () => {
    it('GET /seating-map', async () => {
      getSeatingMapUseCase.execute.mockResolvedValue({ assetId: 'a1', svgElementIds: [] });
      const result = await orgSeatingMapController.getSeatingMap('c1', { user: { id: 'org1', roles: [] } as any });
      expect(result).toEqual({ assetId: 'a1', svgElementIds: [] });
    });

    it('GET /seating-zones', async () => {
      listSeatingZonesUseCase.execute.mockResolvedValue([]);
      const result = await orgSeatingMapController.getSeatingZones('c1', { user: { id: 'org1', roles: [] } as any });
      expect(result).toEqual([]);
    });

    it('GET /ticket-types', async () => {
      listTicketTypesUseCase.execute.mockResolvedValue([]);
      const result = await orgTicketTypeController.getTicketTypes('c1', { user: { id: 'org1', roles: [] } as any });
      expect(result).toEqual([]);
    });

    it('should map ForbiddenConcertOwnershipError to ForbiddenException', async () => {
      listTicketTypesUseCase.execute.mockRejectedValue(new ForbiddenConcertOwnershipError('c1'));
      await expect(orgTicketTypeController.getTicketTypes('c1', { user: { id: 'org1', roles: [] } as any }))
        .rejects.toThrow(ForbiddenException);
    });
  });
});
