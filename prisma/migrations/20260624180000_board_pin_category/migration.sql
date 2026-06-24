-- AlterTable: per-user board prefs now carry a star flag + a category label
ALTER TABLE "board_pins" ADD COLUMN     "category" TEXT;
ALTER TABLE "board_pins" ADD COLUMN     "starred" BOOLEAN NOT NULL DEFAULT false;

-- Existing rows were created as stars (row-presence = starred), so preserve that.
UPDATE "board_pins" SET "starred" = true;
