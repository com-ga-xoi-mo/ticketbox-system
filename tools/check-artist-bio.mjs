import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const jobs = await p.artistBio.findMany({
  orderBy: { createdAt: 'desc' },
  take: 5,
  select: { id: true, status: true, provider: true, retryCount: true, errorMessage: true, createdAt: true },
});
console.table(jobs);
await p.$disconnect();
