const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.artistBio.findUnique({
  where: { id: '0f69af75-9b57-49bb-ab79-7b4064049965' }
}).then(console.log).finally(() => prisma.$disconnect());
