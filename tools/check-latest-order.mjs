import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const order = await p.order.findFirst({
  where: { status: 'PAID' },
  orderBy: { updatedAt: 'desc' },
  select: { id: true, status: true, updatedAt: true, userId: true },
});
console.log('Latest PAID order:', order);
await p.$disconnect();
