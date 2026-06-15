/**
 * Database constraint and uniqueness verification tests.
 *
 * These tests verify that critical PostgreSQL constraints and partial unique
 * indexes are present in the database schema. They check:
 *   - Inventory-bound CHECK constraints on ticket_types
 *   - Sale window CHECK constraint on ticket_types
 *   - Order item total CHECK constraint on order_items
 *   - Concert time window CHECK constraint
 *   - Partial unique index that prevents duplicate accepted check-in events
 *   - Unique indexes on ticket types and seating zones per concert
 *   - Idempotency records unique index
 *
 * Prerequisites: PostgreSQL must be running and the migration must be applied.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const skipIfNoDB =
  process.env.SKIP_DB_TESTS === '1' || process.env.CI === 'true' ? it.skip : it;

const REQUIRED_CONSTRAINTS = [
  'concerts_time_window_chk',
  'ticket_types_inventory_bounds_chk',
  'ticket_types_max_per_user_positive_chk',
  'ticket_types_sale_window_chk',
  'order_items_total_matches_quantity_chk',
];

const REQUIRED_INDEXES = [
  'checkin_events_one_accepted_per_ticket_idx',
  'ticket_types_concert_id_code_key',
  'seating_zones_concert_id_svg_element_id_key',
  'idempotency_records_user_id_operation_idempotency_key_key',
];

describe('Database constraint verification', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeAll(async () => {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  skipIfNoDB('all required CHECK constraints exist in PostgreSQL', async () => {
    const rows: Array<{ conname: string }> = await prisma.$queryRaw`
      SELECT conname
      FROM pg_constraint
      WHERE conname = ANY(${REQUIRED_CONSTRAINTS})
    `;
    const found = new Set(rows.map((r) => r.conname));
    for (const name of REQUIRED_CONSTRAINTS) {
      expect(found.has(name), `Missing constraint: ${name}`).toBe(true);
    }
  });

  skipIfNoDB('all required unique indexes exist in PostgreSQL', async () => {
    const rows: Array<{ indexname: string }> = await prisma.$queryRaw`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = ANY(${REQUIRED_INDEXES})
    `;
    const found = new Set(rows.map((r) => r.indexname));
    for (const name of REQUIRED_INDEXES) {
      expect(found.has(name), `Missing index: ${name}`).toBe(true);
    }
  });

  skipIfNoDB('tickets table has a unique index on qr_token_hash', async () => {
    const rows: Array<{ indexname: string }> = await prisma.$queryRaw`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'tickets'
        AND indexname = 'tickets_qr_token_hash_key'
    `;
    expect(rows.length, 'tickets_qr_token_hash_key must exist').toBe(1);
  });

  skipIfNoDB('payments table has a unique index on provider_transaction_id when present', async () => {
    const rows: Array<{ indexname: string }> = await prisma.$queryRaw`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'payments'
        AND indexname = 'payments_provider_transaction_id_key'
    `;
    expect(rows.length, 'payments_provider_transaction_id_key must exist').toBe(1);
  });

  skipIfNoDB('users table has a unique index on email', async () => {
    const rows: Array<{ indexname: string }> = await prisma.$queryRaw`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'users'
        AND indexname = 'users_email_key'
    `;
    expect(rows.length, 'users_email_key must exist').toBe(1);
  });

  skipIfNoDB('concerts table has a unique index on slug', async () => {
    const rows: Array<{ indexname: string }> = await prisma.$queryRaw`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'concerts'
        AND indexname = 'concerts_slug_key'
    `;
    expect(rows.length, 'concerts_slug_key must exist').toBe(1);
  });

  skipIfNoDB('ticket_type_zones composite primary key enforces uniqueness per (ticket_type_id, seating_zone_id)', async () => {
    // ticket_type_zones uses a composite @@id([ticketTypeId, seatingZoneId]) which
    // generates a primary key constraint — there is no separate unique index.
    const rows: Array<{ indexname: string }> = await prisma.$queryRaw`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'ticket_type_zones'
        AND indexname = 'ticket_type_zones_pkey'
    `;
    expect(rows.length, 'ticket_type_zones_pkey must exist').toBe(1);
  });
});
