import { PrismaClient } from '@prisma/client';

async function checkAllTicketTypes() {
  const prisma = new PrismaClient();
  const ticketTypes = await prisma.ticketType.findMany({
    select: {
      id: true,
      name: true,
      totalQuantity: true,
      reservedQuantity: true,
      soldQuantity: true
    }
  });
  console.table(ticketTypes);
  
  // Find orders that are PENDING_PAYMENT
  const pendingOrders = await prisma.order.findMany({
    where: { status: 'PENDING_PAYMENT' },
    include: { items: true }
  });
  
  const expectedReserved = new Map();
  for (const order of pendingOrders) {
    // Only count if reservation hasn't expired yet
    if (order.reservationExpiresAt && order.reservationExpiresAt > new Date()) {
      for (const item of order.items) {
        expectedReserved.set(item.ticketTypeId, (expectedReserved.get(item.ticketTypeId) || 0) + item.quantity);
      }
    }
  }
  
  console.log("Expected Reserved from valid PENDING_PAYMENT orders:");
  for (const [id, qty] of expectedReserved.entries()) {
      const tt = ticketTypes.find(t => t.id === id);
      console.log(`- ${tt?.name}: ${qty}`);
  }

  await prisma.$disconnect();
}

checkAllTicketTypes();
