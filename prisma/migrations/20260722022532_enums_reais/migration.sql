-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "ProgressUnit" AS ENUM ('pages', 'percent');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('email', 'phone', 'password');

-- AlterTable: List.visibility text -> enum (cast explícito, sem drop/recreate)
ALTER TABLE "List"
  ALTER COLUMN "visibility" DROP DEFAULT,
  ALTER COLUMN "visibility" TYPE "Visibility" USING "visibility"::"Visibility",
  ALTER COLUMN "visibility" SET DEFAULT 'public';

-- AlterTable: Club.visibility text -> enum
ALTER TABLE "Club"
  ALTER COLUMN "visibility" TYPE "Visibility" USING "visibility"::"Visibility";

-- AlterTable: User.progressUnit text -> enum
ALTER TABLE "User"
  ALTER COLUMN "progressUnit" DROP DEFAULT,
  ALTER COLUMN "progressUnit" TYPE "ProgressUnit" USING "progressUnit"::"ProgressUnit",
  ALTER COLUMN "progressUnit" SET DEFAULT 'pages';

-- AlterTable: VerificationCode.type text -> enum
ALTER TABLE "VerificationCode"
  ALTER COLUMN "type" TYPE "VerificationType" USING "type"::"VerificationType";
