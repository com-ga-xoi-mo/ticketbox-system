/**
 * Schema validation tests.
 *
 * These tests verify that the Prisma schema is valid and that the generated
 * Prisma Client exports the expected models and enum types. They run without
 * requiring a live database connection.
 */

import { describe, expect, it } from 'vitest';

describe('Prisma schema validation', () => {
  it('imports PrismaClient from @prisma/client without errors', async () => {
    // Dynamic import ensures module resolution is verified at test time.
    const { PrismaClient } = await import('@prisma/client');
    expect(PrismaClient).toBeDefined();
    expect(typeof PrismaClient).toBe('function');
  });

  it('exports all required enum types', async () => {
    const client = await import('@prisma/client');

    // User & RBAC
    expect(client.UserStatus).toBeDefined();
    expect(client.RoleCode).toBeDefined();
    expect(client.Gender).toBeDefined();

    // Concert catalog
    expect(client.ConcertStatus).toBeDefined();
    expect(client.AssetKind).toBeDefined();
    expect(client.AssetStatus).toBeDefined();
    expect(client.SeatingZoneStatus).toBeDefined();
    expect(client.TicketTypeStatus).toBeDefined();

    // Orders & payments
    expect(client.OrderStatus).toBeDefined();
    expect(client.PaymentStatus).toBeDefined();
    expect(client.TicketStatus).toBeDefined();

    // Operational
    expect(client.CheckinEventResult).toBeDefined();
    expect(client.NotificationStatus).toBeDefined();
    expect(client.ArtistBioStatus).toBeDefined();
    expect(client.GuestListRowDisposition).toBeDefined();
    expect(client.GuestListEntryStatus.ACTIVE).toBe('ACTIVE');
  });

  it('generates durable guest-list import and active projection fields', async () => {
    const { Prisma } = await import('@prisma/client');
    const batch = Prisma.dmmf.datamodel.models.find((model) => model.name === 'GuestListBatch');
    const row = Prisma.dmmf.datamodel.models.find((model) => model.name === 'GuestListImportRow');
    const guest = Prisma.dmmf.datamodel.models.find((model) => model.name === 'GuestListEntry');
    expect(batch?.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining([
        'checksum',
        'importSequence',
        'leaseOwner',
        'leaseExpiresAt',
        'reportStorageKey',
      ]),
    );
    expect(row?.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(['batchId', 'rowNumber', 'disposition', 'reasonMessage']),
    );
    expect(guest?.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(['concertId', 'latestBatchId', 'normalizedPhone', 'cancelledAt']),
    );
  });

    it('exports all required Gender values', async () => {
    const { Gender } = await import('@prisma/client');
    expect(Gender.MALE).toBe('MALE');
    expect(Gender.FEMALE).toBe('FEMALE');
    expect(Gender.OTHER).toBe('OTHER');
  });

  it('exports AssetKind.USER_AVATAR', async () => {
    const { AssetKind } = await import('@prisma/client');
    expect(AssetKind.USER_AVATAR).toBe('USER_AVATAR');
  });

  it('generates user profile and avatar fields', async () => {
    const { Prisma } = await import('@prisma/client');
    const user = Prisma.dmmf.datamodel.models.find((model) => model.name === 'User');
    expect(user?.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining([
        'phone',
        'dateOfBirth',
        'gender',
        'addressLine',
        'city',
        'district',
        'avatarAssetId',
      ]),
    );
  });

  it('exports all required RoleCode values', async () => {
    const { RoleCode } = await import('@prisma/client');
    expect(RoleCode.AUDIENCE).toBe('AUDIENCE');
    expect(RoleCode.ORGANIZER).toBe('ORGANIZER');
    expect(RoleCode.CHECKIN_STAFF).toBe('CHECKIN_STAFF');
    expect(RoleCode.ADMIN).toBe('ADMIN');
  });

  it('exports all required ConcertStatus values', async () => {
    const { ConcertStatus } = await import('@prisma/client');
    expect(ConcertStatus.DRAFT).toBe('DRAFT');
    expect(ConcertStatus.PUBLISHED).toBe('PUBLISHED');
    expect(ConcertStatus.CANCELLED).toBe('CANCELLED');
  });

  it('generates ArtistBio retry metadata fields from Prisma schema', async () => {
    const { Prisma } = await import('@prisma/client');
    const artistBio = Prisma.dmmf.datamodel.models.find((model) => model.name === 'ArtistBio');

    expect(artistBio?.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining([
        'retryCount',
        'maxAttempts',
        'lastAttemptedAt',
        'nextRetryAt',
        'metadata',
      ]),
    );
  });

  it('exports all required UserStatus values', async () => {
    const { UserStatus } = await import('@prisma/client');
    expect(UserStatus.ACTIVE).toBe('ACTIVE');
    expect(UserStatus.DISABLED).toBe('DISABLED');
  });
});
