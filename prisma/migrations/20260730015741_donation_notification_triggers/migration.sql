/*
  Warnings:

  - You are about to drop the column `readAt` on the `Notification` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DONATION_REQUEST_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'DONATION_CHOSEN';
ALTER TYPE "NotificationType" ADD VALUE 'DONATION_COMPLETED';

-- DropIndex
DROP INDEX "Notification_userId_createdAt_idx";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "readAt",
ADD COLUMN     "actorId" TEXT,
ADD COLUMN     "read" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
