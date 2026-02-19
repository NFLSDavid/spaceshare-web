-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'NEGOTIATING';

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "offeredTotal" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "blockedListingIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
