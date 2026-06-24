import { PrismaClient } from '@prisma/client';

async function purgeZombies() {
  const prisma = new PrismaClient();
  
  // Find all orders that are PENDING_PAYMENT and have expired
  const now = new Date();
  const zombies = await prisma.order.findMany({
    where: {
      status: 'PENDING_PAYMENT',
      reservationExpiresAt: { lte: now }
    }
  });

  console.log(`Found ${zombies.length} zombie orders. Updating them to EXPIRED...`);
  
  for (const z of zombies) {
    await prisma.order.update({
      where: { id: z.id },
      data: { status: 'EXPIRED', expiredAt: now }
    });
  }
  
  console.log("Zombies purged!");

  // Now fix inventory based ONLY on valid PENDING orders
  const validPending = await prisma.order.findMany({
    where: {
      status: 'PENDING_PAYMENT',
      reservationExpiresAt: { gt: now }
    },
    include: { items: true }
  });

  const expectedReserved = new Map();
  for (const order of validPending) {
    for (const item of order.items) {
      expectedReserved.set(item.ticketTypeId, (expectedReserved.get(item.ticketTypeId) || 0) + item.quantity);
    }
  }

  const ticketTypes = await prisma.ticketType.findMany();
  for (const tt of ticketTypes) {
    const expected = expectedReserved.get(tt.id) || 0;
    if (tt.reservedQuantity !== expected) {
      console.log(`Fixing ${tt.name}: changing reservedQuantity from ${tt.reservedQuantity} to ${expected}`);
      await prisma.ticketType.update({
        where: { id: tt.id },
        data: { reservedQuantity: expected }
      });
    }
  }
  
  console.log("Inventory synced!");
  await prisma.$disconnect();
}

purgeZombies();
