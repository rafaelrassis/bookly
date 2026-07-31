-- AlterEnum
ALTER TYPE "FeedEventType" ADD VALUE 'CLUB_BOOK_OF_MONTH_SET';

-- DropForeignKey
ALTER TABLE "Club" DROP CONSTRAINT "Club_bookId_fkey";

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;
