import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import { RolesGuard } from '../../../../identity/adapters/http/guards/roles.guard';
import { ForbiddenConcertOwnershipError } from '../../../../identity/domain/errors';
import { Role } from '../../../../identity/domain/role.enum';
import { JwtAuthGuard } from '../../../../identity/infrastructure/passport/jwt-auth.guard';
import { ROLES_KEY } from '../../../../identity/adapters/http/decorators/roles.decorator';
import {
  InvalidSeatingMapContentTypeError,
  SeatingMapFileTooLargeError,
  UnsafeSeatingMapSvgError,
} from '../../../domain/seating-map.errors';
import { OrganizerSeatingMapController } from '../organizer-seating-map.controller';

function createController() {
  const uploadUseCase = {
    execute: vi.fn(async () => ({
      asset: {
        id: 'asset-1',
        kind: 'SEATING_MAP',
        storageKey: 'seating-maps/concert-1/asset-1.svg',
        contentType: 'image/svg+xml',
        sizeBytes: 20,
        originalName: 'map.svg',
        checksum: 'sha256:abc',
        publicUrl: '/storage/map.svg',
      },
      concert: { id: 'concert-1', seatingMapAssetId: 'asset-1' },
    })),
  };
  const zonesUseCase = {
    execute: vi.fn(async () => ({ zones: [{ id: 'zone-1', svgElementId: 'vip' }] })),
  };
  const mappingsUseCase = {
    execute: vi.fn(async () => ({
      ticketTypeId: 'type-1',
      mappedZones: [{ seatingZoneId: 'zone-1', svgElementId: 'vip', label: 'VIP' }],
    })),
  };
  const controller = new OrganizerSeatingMapController(
    uploadUseCase as never,
    zonesUseCase as never,
    mappingsUseCase as never,
  );
  const req = { user: { id: 'organizer-1' } } as never;

  return { controller, mappingsUseCase, req, uploadUseCase, zonesUseCase };
}

describe('OrganizerSeatingMapController', () => {
  it('uses JwtAuthGuard before RolesGuard so unauthenticated requests fail before role checks', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, OrganizerSeatingMapController);
    const roles = new Reflector().get<Role[]>(ROLES_KEY, OrganizerSeatingMapController);

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles).toEqual([Role.ORGANIZER]);
  });

  it('uploads a valid SVG and returns asset info', async () => {
    const { controller, req } = createController();

    const result = await controller.uploadSeatingMap(
      'concert-1',
      {
        buffer: Buffer.from('<svg></svg>'),
        originalname: 'map.svg',
        mimetype: 'image/svg+xml',
        size: 11,
      },
      req,
    );

    expect(result.asset).toMatchObject({ id: 'asset-1', kind: 'SEATING_MAP' });
  });

  it('sends missing file to the use case and maps validation failures to 400', async () => {
    const { controller, req, uploadUseCase } = createController();
    vi.mocked(uploadUseCase.execute).mockRejectedValue(new UnsafeSeatingMapSvgError(['script']));

    await expect(controller.uploadSeatingMap('concert-1', undefined, req)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('maps wrong content type and oversized uploads to 400', async () => {
    const { controller, req, uploadUseCase } = createController();
    vi.mocked(uploadUseCase.execute).mockRejectedValueOnce(
      new InvalidSeatingMapContentTypeError('text/plain'),
    );

    await expect(
      controller.uploadSeatingMap(
        'concert-1',
        {
          buffer: Buffer.from('plain text'),
          originalname: 'map.txt',
          mimetype: 'text/plain',
          size: 10,
        },
        req,
      ),
    ).rejects.toThrow(BadRequestException);

    vi.mocked(uploadUseCase.execute).mockRejectedValueOnce(
      new SeatingMapFileTooLargeError(10_000, 5_000),
    );

    await expect(
      controller.uploadSeatingMap(
        'concert-1',
        {
          buffer: Buffer.alloc(10_000),
          originalname: 'map.svg',
          mimetype: 'image/svg+xml',
          size: 10_000,
        },
        req,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('maps non-owner authorization failures to 403', async () => {
    const { controller, req, uploadUseCase } = createController();
    vi.mocked(uploadUseCase.execute).mockRejectedValue(
      new ForbiddenConcertOwnershipError('concert-1'),
    );

    await expect(
      controller.uploadSeatingMap(
        'concert-1',
        {
          buffer: Buffer.from('<svg></svg>'),
          originalname: 'map.svg',
          mimetype: 'image/svg+xml',
          size: 11,
        },
        req,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('upserts seating zones and updates zone mappings', async () => {
    const { controller, req } = createController();

    await expect(
      controller.upsertZones(
        'concert-1',
        { zones: [{ svgElementId: 'vip', label: 'VIP', displayOrder: 1 }] },
        req,
      ),
    ).resolves.toMatchObject({ zones: [{ id: 'zone-1' }] });
    await expect(
      controller.updateZoneMappings(
        'concert-1',
        'type-1',
        { seatingZoneIds: ['zone-1'] },
        req,
      ),
    ).resolves.toMatchObject({ ticketTypeId: 'type-1' });
  });
});
