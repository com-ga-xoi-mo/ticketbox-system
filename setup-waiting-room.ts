import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const concerts = await prisma.concert.findMany();
  
  if (concerts.length === 0) {
    console.log('No concerts found in the database. Please run seed script first.');
    return;
  }

  console.log(`Found ${concerts.length} concerts. Setting up waiting room for all of them...`);

  for (const concert of concerts) {
    const config = await prisma.waitingRoomConfig.upsert({
      where: { concertId: concert.id },
      create: {
        concertId: concert.id,
        enabled: true,
        autoActivate: true,
        manualOverride: 'FORCE_ON',
        maxConcurrency: 1, // SET TO 1 SO THEY CAN EASILY TEST QUEUING
        admissionTtlSeconds: 120, // 2 minutes to quickly test
        activateThreshold: 5,
        deactivateThreshold: 2,
        cooldownSeconds: 10,
      },
      update: {
        enabled: true,
        autoActivate: true,
        manualOverride: 'FORCE_ON',
        maxConcurrency: 1, // Small number to trigger waiting room
        admissionTtlSeconds: 120,
      },
    });
    console.log(`Waiting room configured for concert: ${concert.id}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
