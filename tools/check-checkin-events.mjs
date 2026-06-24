import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const ticketId = process.argv[2];
if (!ticketId) { console.error('Usage: node check-checkin-events.mjs <ticketId>'); process.exit(1); }
const rows = await p.checkinEvent.findMany({
  where: { ticketId },
  select: { result: true, source: true, deviceId: true, createdAt: true },
});
console.table(rows);
console.log('ACCEPTED count =', rows.filter(r => r.result === 'ACCEPTED').length, '(phải = 1)');
const ticket = await p.ticket.findUnique({ where: { id: ticketId }, select: { status: true } });
console.log('Ticket status =', ticket?.status, '(phải = CHECKED_IN)');
await p.$disconnect();
