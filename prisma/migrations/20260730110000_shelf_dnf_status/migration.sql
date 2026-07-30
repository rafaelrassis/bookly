-- AlterEnum
ALTER TYPE "ShelfStatus" ADD VALUE 'DNF';

-- AlterTable
ALTER TABLE "ShelfEntry" ADD COLUMN     "abandonedAt" TIMESTAMP(3);
