-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('DISPONIVEL', 'RESERVADO', 'DOADO');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDENTE', 'ESCOLHIDO', 'RECUSADO');

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" CHAR(2) NOT NULL,
    "status" "DonationStatus" NOT NULL DEFAULT 'DISPONIVEL',
    "whatsapp" TEXT,
    "instagram" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "donatedAt" TIMESTAMP(3),

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationRequest" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Donation_bookId_status_idx" ON "Donation"("bookId", "status");

-- CreateIndex
CREATE INDEX "Donation_state_city_status_idx" ON "Donation"("state", "city", "status");

-- CreateIndex
CREATE INDEX "Donation_donorId_status_idx" ON "Donation"("donorId", "status");

-- CreateIndex
CREATE INDEX "DonationRequest_donationId_status_idx" ON "DonationRequest"("donationId", "status");

-- CreateIndex
CREATE INDEX "DonationRequest_requesterId_idx" ON "DonationRequest"("requesterId");

-- CreateIndex
CREATE UNIQUE INDEX "DonationRequest_donationId_requesterId_key" ON "DonationRequest"("donationId", "requesterId");

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationRequest" ADD CONSTRAINT "DonationRequest_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationRequest" ADD CONSTRAINT "DonationRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
