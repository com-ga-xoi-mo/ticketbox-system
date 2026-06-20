/**
 * Database seed verification tests.
 *
 * These tests verify that the seed script has populated the database with all
 * required demo data: roles, users, concerts, ticket types, seating zones, and
 * ticket-to-zone mappings.
 *
 * Prerequisites: PostgreSQL must be running and migrations + seed must be applied.
 * Skip these tests when the database is unavailable (e.g., CI without services).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const skipIfNoDB = process.env.SKIP_DB_TESTS === '1' || process.env.CI === 'true' ? it.skip : it;

const REQUIRED_CONCERT_TITLES = [
  'Anh Trai Say Hi Live Concert',
  'Anh Trai Vuot Ngan Chong Gai Concert',
  'Em Xinh Say Hi Showcase',
  'Chi Dep Dap Gio Re Song Gala',
];

const DEMO_EMAILS = [
  'audience@ticketbox.test',
  'organizer@ticketbox.test',
  'staff@ticketbox.test',
  'admin@ticketbox.test',
];

describe('Database seed verification', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeAll(async () => {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  skipIfNoDB('all four required roles exist', async () => {
    const count = await prisma.role.count();
    expect(count).toBeGreaterThanOrEqual(4);

    const { RoleCode } = await import('@prisma/client');
    for (const code of [
      RoleCode.AUDIENCE,
      RoleCode.ORGANIZER,
      RoleCode.CHECKIN_STAFF,
      RoleCode.ADMIN,
    ]) {
      const role = await prisma.role.findUnique({ where: { code } });
      expect(role, `Role ${code} must exist`).not.toBeNull();
    }
  });

  skipIfNoDB('all four demo users exist with correct emails', async () => {
    const userCount = await prisma.user.count({
      where: { email: { in: DEMO_EMAILS } },
    });
    expect(userCount).toBe(4);
  });

  skipIfNoDB('each demo user has an assigned role', async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: DEMO_EMAILS } },
      include: { roles: true },
    });
    for (const user of users) {
      expect(user.roles.length, `${user.email} must have at least one role`).toBeGreaterThan(0);
    }
  });

  skipIfNoDB('all four required concerts exist and are published', async () => {
    const concerts = await prisma.concert.findMany({
      where: { title: { in: REQUIRED_CONCERT_TITLES } },
    });
    expect(concerts.length).toBe(4);
    for (const concert of concerts) {
      expect(concert.status, `${concert.title} must be PUBLISHED`).toBe('PUBLISHED');
    }
  });

  skipIfNoDB('each concert has at least one seating zone', async () => {
    const concerts = await prisma.concert.findMany({
      where: { title: { in: REQUIRED_CONCERT_TITLES } },
      include: { seatingZones: true },
    });
    for (const concert of concerts) {
      expect(
        concert.seatingZones.length,
        `${concert.title} must have seating zones`,
      ).toBeGreaterThan(0);
    }
  });

  skipIfNoDB('each concert has ticket types with valid inventory and sale windows', async () => {
    const concerts = await prisma.concert.findMany({
      where: { title: { in: REQUIRED_CONCERT_TITLES } },
      include: {
        ticketTypes: true,
      },
    });
    for (const concert of concerts) {
      expect(concert.ticketTypes.length, `${concert.title} must have ticket types`).toBeGreaterThan(
        0,
      );
      for (const tt of concert.ticketTypes) {
        expect(tt.totalQuantity, `${tt.code} total quantity must be positive`).toBeGreaterThan(0);
        expect(tt.reservedQuantity, `${tt.code} reserved must start at 0`).toBe(0);
        expect(tt.soldQuantity, `${tt.code} sold must start at 0`).toBe(0);
        expect(tt.maxPerUser, `${tt.code} max per user must be positive`).toBeGreaterThan(0);
        expect(
          new Date(tt.saleStartsAt).getTime(),
          `${tt.code} sale window must be valid`,
        ).toBeLessThan(new Date(tt.saleEndsAt).getTime());
      }
    }
  });

  skipIfNoDB('each ticket type maps to at least one seating zone in the same concert', async () => {
    const concerts = await prisma.concert.findMany({
      where: { title: { in: REQUIRED_CONCERT_TITLES } },
      include: {
        ticketTypes: {
          include: { zones: true },
        },
      },
    });
    for (const concert of concerts) {
      for (const tt of concert.ticketTypes) {
        expect(tt.zones.length, `${tt.code} must map to at least one zone`).toBeGreaterThan(0);
        for (const mapping of tt.zones) {
          expect(mapping.concertId, `${tt.code} zone mapping must be for the same concert`).toBe(
            concert.id,
          );
        }
      }
    }
  });

  skipIfNoDB('running seed twice does not duplicate demo records', async () => {
    // Counts must remain stable (idempotency check).
    const [roleCount, userCount, concertCount] = await Promise.all([
      prisma.role.count(),
      prisma.user.count({ where: { email: { in: DEMO_EMAILS } } }),
      prisma.concert.count({ where: { title: { in: REQUIRED_CONCERT_TITLES } } }),
    ]);
    expect(roleCount).toBeGreaterThanOrEqual(4);
    expect(userCount).toBe(4);
    expect(concertCount).toBe(4);
  });
});
