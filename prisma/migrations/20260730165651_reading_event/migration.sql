-- CreateTable
CREATE TABLE "ReadingEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "shelfEntryId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReadingEvent_userId_finishedAt_idx" ON "ReadingEvent"("userId", "finishedAt");

-- AddForeignKey
ALTER TABLE "ReadingEvent" ADD CONSTRAINT "ReadingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingEvent" ADD CONSTRAINT "ReadingEvent_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingEvent" ADD CONSTRAINT "ReadingEvent_shelfEntryId_fkey" FOREIGN KEY ("shelfEntryId") REFERENCES "ShelfEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
