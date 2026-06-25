// tools/setup-reminder-test.mjs
import { PrismaClient, ConcertStatus } from '@prisma/client';

const p = new PrismaClient();

// Tìm concert đang có vé ISSUED trên order PAID
const t = await p.ticket.findFirst({
  where: { status: 'ISSUED', order: { status: 'PAID' } },
  select: { concertId: true },
});
if (!t) {
  console.error('Chưa có vé PAID/ISSUED nào — chạy luồng mua vé hoặc seed trước.');
  await p.$disconnect();
  process.exit(1);
}

// Đẩy concert vào cửa sổ reminder: [now+24h, now+24h+5m)
const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 1000); // now+24h+2m
const concert = await p.concert.update({
  where: { id: t.concertId },
  data: { status: ConcertStatus.PUBLISHED, startsAt },
  select: { id: true, title: true, status: true, startsAt: true },
});

const holders = await p.ticket.findMany({
  where: {
    concertId: concert.id,
    status: { in: ['ISSUED', 'CHECKED_IN'] },
    order: { status: 'PAID' },
  },
  distinct: ['userId'],
  select: { user: { select: { email: true } } },
});

console.table([
  { id: concert.id, title: concert.title, status: concert.status, startsAt: concert.startsAt.toISOString() },
]);
console.log(`Holders hợp lệ (${holders.length}):`, holders.map((h) => h.user.email).join(', '));
console.log('\n→ Restart worker (npm run dev:worker) để job scan chạy ngay.');

await p.$disconnect();
