import { PrismaClient } from '@prisma/client';

async function fixInventory() {
  const prisma = new PrismaClient();
  const ticketTypes = await prisma.ticketType.findMany({
    select: { id: true, name: true, reservedQuantity: true }
  });
  
  const pendingOrders = await prisma.order.findMany({
    where: { status: 'PENDING_PAYMENT' },
    include: { items: true }
  });
  
  const expectedReserved = new Map();
  for (const order of pendingOrders) {
    if (order.reservationExpiresAt && order.reservationExpiresAt > new Date()) {
      for (const item of order.items) {
        expectedReserved.set(item.ticketTypeId, (expectedReserved.get(item.ticketTypeId) || 0) + item.quantity);
      }
    }
  }
  
  console.log("Fixing inventory...");
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
  console.log("Done fixing inventory.");

  await prisma.$disconnect();
}

fixInventory();
