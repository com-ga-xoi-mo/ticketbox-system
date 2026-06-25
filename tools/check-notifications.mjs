import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const u = await p.user.findUniqueOrThrow({ where: { email: 'audience@ticketbox.test' } });
const n = await p.notification.findMany({
  where: { userId: u.id },
  orderBy: { createdAt: 'desc' },
  take: 5,
});
console.table(n.map(x => ({ type: x.type, status: x.status, channel: x.channel, createdAt: x.createdAt })));
await p.$disconnect();
