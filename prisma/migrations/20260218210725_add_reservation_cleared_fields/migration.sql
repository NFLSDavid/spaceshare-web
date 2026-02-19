-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "clearedByClient" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "clearedByHost" BOOLEAN NOT NULL DEFAULT false;
