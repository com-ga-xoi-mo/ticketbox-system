-- CreateEnum
CREATE TYPE "ticket_transfer_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "ticket_status" ADD VALUE 'TRANSFER_PENDING';

-- CreateTable
CREATE TABLE "ticket_transfers" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "ticket_transfer_status" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_transfers_tokenHash_key" ON "ticket_transfers"("tokenHash");

-- AddForeignKey
ALTER TABLE "ticket_transfers" ADD CONSTRAINT "ticket_transfers_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_transfers" ADD CONSTRAINT "ticket_transfers_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
