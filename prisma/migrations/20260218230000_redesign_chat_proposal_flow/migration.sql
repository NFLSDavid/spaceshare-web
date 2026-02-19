-- Update existing NEGOTIATING reservations to CANCELLED before altering enum
UPDATE "reservations" SET "status" = 'CANCELLED' WHERE "status" = 'NEGOTIATING';

-- AlterEnum: remove NEGOTIATING, add CANCEL_REQUESTED
CREATE TYPE "ReservationStatus_new" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED', 'COMPLETED', 'CANCEL_REQUESTED');
ALTER TABLE "reservations" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "reservations" ALTER COLUMN "status" TYPE "ReservationStatus_new" USING ("status"::text::"ReservationStatus_new");
ALTER TYPE "ReservationStatus" RENAME TO "ReservationStatus_old";
ALTER TYPE "ReservationStatus_new" RENAME TO "ReservationStatus";
DROP TYPE "ReservationStatus_old";
ALTER TABLE "reservations" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable: reservations - remove offeredTotal, add cancelRequestedBy
ALTER TABLE "reservations" DROP COLUMN "offeredTotal";
ALTER TABLE "reservations" ADD COLUMN "cancelRequestedBy" TEXT;

-- AlterTable: users - remove blockedListingIds, add blockedUserIds + showEmail + showPhone
ALTER TABLE "users" DROP COLUMN "blockedListingIds";
ALTER TABLE "users" ADD COLUMN "blockedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "users" ADD COLUMN "showEmail" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "showPhone" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: messages - add proposalData
ALTER TABLE "messages" ADD COLUMN "proposalData" JSONB;
