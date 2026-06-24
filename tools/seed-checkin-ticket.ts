import { createHash } from 'node:crypto';
import { OrderStatus, PrismaClient, TicketStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const QR = process.argv[2] ?? 'MY-TEST-QR-001';
  const hash = createHash('sha256').update(QR).digest('hex');
  const c = await prisma.concert.findFirstOrThrow({
    where: { slug: 'anh-trai-say-hi-2026' },
    include: { ticketTypes: true },
  });
  const u = await prisma.user.findUniqueOrThrow({ where: { email: 'audience@ticketbox.test' } });
  const tt = c.ticketTypes[0];
  const order = await prisma.order.create({
    data: {
      orderNumber: `MANUAL-${Date.now()}`,
      userId: u.id,
      concertId: c.id,
      status: OrderStatus.PAID,
      totalAmountVnd: tt.priceVnd,
      paidAt: new Date(),
    },
  });
  const item = await prisma.orderItem.create({
    data: {
      orderId: order.id,
      ticketTypeId: tt.id,
      quantity: 1,
      unitPriceVnd: tt.priceVnd,
      totalPriceVnd: tt.priceVnd,
    },
  });
  const t = await prisma.ticket.create({
    data: {
      ticketNumber: `MANUAL-${Date.now()}`,
      orderId: order.id,
      orderItemId: item.id,
      userId: u.id,
      concertId: c.id,
      ticketTypeId: tt.id,
      qrTokenHash: hash,
      status: TicketStatus.ISSUED,
    },
  });
  console.log(JSON.stringify({ qrPayload: QR, qrPayloadHash: hash, ticketId: t.id, concertId: c.id }));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
