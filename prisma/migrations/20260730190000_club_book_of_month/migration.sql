-- CreateTable
CREATE TABLE "ClubBookOfMonth" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "setById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubBookOfMonth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubBookOfMonth_clubId_month_idx" ON "ClubBookOfMonth"("clubId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ClubBookOfMonth_clubId_month_key" ON "ClubBookOfMonth"("clubId", "month");

-- AddForeignKey
ALTER TABLE "ClubBookOfMonth" ADD CONSTRAINT "ClubBookOfMonth_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubBookOfMonth" ADD CONSTRAINT "ClubBookOfMonth_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubBookOfMonth" ADD CONSTRAINT "ClubBookOfMonth_setById_fkey" FOREIGN KEY ("setById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
