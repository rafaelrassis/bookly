-- AlterEnum
BEGIN;
CREATE TYPE "VerificationType_new" AS ENUM ('email', 'password');
ALTER TABLE "VerificationCode" ALTER COLUMN "type" TYPE "VerificationType_new" USING ("type"::text::"VerificationType_new");
ALTER TYPE "VerificationType" RENAME TO "VerificationType_old";
ALTER TYPE "VerificationType_new" RENAME TO "VerificationType";
DROP TYPE "public"."VerificationType_old";
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
