import { PrismaClient } from '@prisma/client';

async function checkPaymentEvents() {
  const prisma = new PrismaClient();
  const paymentEvents = await prisma.paymentEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  console.log("Latest Payment Events:");
  for (const event of paymentEvents) {
    console.log(`- ${event.eventType} for tx ${event.providerTransactionId} at ${event.createdAt}`);
  }
  await prisma.$disconnect();
}

checkPaymentEvents();
