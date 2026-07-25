-- AlterTable
ALTER TABLE "Book" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT;
