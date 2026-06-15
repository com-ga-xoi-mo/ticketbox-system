import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const requiredConcertTitles = [
  'Anh Trai Say Hi Live Concert',
  'Anh Trai Vuot Ngan Chong Gai Concert',
  'Em Xinh Say Hi Showcase',
  'Chi Dep Dap Gio Re Song Gala',
];

const requiredConstraintNames = [
  'concerts_time_window_chk',
  'ticket_types_inventory_bounds_chk',
  'ticket_types_max_per_user_positive_chk',
  'ticket_types_sale_window_chk',
  'order_items_total_matches_quantity_chk',
];

const requiredIndexNames = [
  'checkin_events_one_accepted_per_ticket_idx',
  'ticket_types_concert_id_code_key',
  'seating_zones_concert_id_svg_element_id_key',
  'idempotency_records_user_id_operation_idempotency_key_key',
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const [roleCount, userCount, concertCount] = await Promise.all([
    prisma.role.count(),
    prisma.user.count({
      where: {
        email: {
          in: [
            'audience@ticketbox.test',
            'organizer@ticketbox.test',
            'staff@ticketbox.test',
            'admin@ticketbox.test',
          ],
        },
      },
    }),
    prisma.concert.count({
      where: {
        title: {
          in: requiredConcertTitles,
        },
      },
    }),
  ]);

  assert(roleCount >= 4, `Expected at least 4 roles, found ${roleCount}`);
  assert(userCount === 4, `Expected 4 demo users, found ${userCount}`);
  assert(concertCount === 4, `Expected 4 required concerts, found ${concertCount}`);

  const concerts = await prisma.concert.findMany({
    where: {
      title: {
        in: requiredConcertTitles,
      },
    },
    include: {
      seatingZones: true,
      ticketTypes: {
        include: {
          zones: true,
        },
      },
    },
  });

  for (const concert of concerts) {
    assert(concert.status === 'PUBLISHED', `${concert.title} must be published`);
    assert(concert.seatingZones.length > 0, `${concert.title} must have seating zones`);
    assert(concert.ticketTypes.length > 0, `${concert.title} must have ticket types`);
    for (const ticketType of concert.ticketTypes) {
      assert(ticketType.totalQuantity > 0, `${ticketType.code} must have capacity`);
      assert(ticketType.reservedQuantity === 0, `${ticketType.code} reserved quantity must start at 0`);
      assert(ticketType.soldQuantity === 0, `${ticketType.code} sold quantity must start at 0`);
      assert(ticketType.maxPerUser > 0, `${ticketType.code} max per user must be positive`);
      assert(ticketType.saleStartsAt < ticketType.saleEndsAt, `${ticketType.code} sale window is invalid`);
      assert(ticketType.zones.length > 0, `${ticketType.code} must map to at least one seating zone`);
      for (const mapping of ticketType.zones) {
        assert(
          mapping.concertId === concert.id,
          `${ticketType.code} has a ticket-to-zone mapping outside its concert`,
        );
      }
    }
  }

  const constraints = await prisma.$queryRaw`
    SELECT conname
    FROM pg_constraint
    WHERE conname = ANY(${requiredConstraintNames})
  `;
  const constraintNames = new Set(constraints.map((row) => row.conname));
  for (const name of requiredConstraintNames) {
    assert(constraintNames.has(name), `Missing database constraint ${name}`);
  }

  const indexes = await prisma.$queryRaw`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = ANY(${requiredIndexNames})
  `;
  const indexNames = new Set(indexes.map((row) => row.indexname));
  for (const name of requiredIndexNames) {
    assert(indexNames.has(name), `Missing database index ${name}`);
  }

  console.log('Database seed verification passed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
