/*
  Warnings:

  - A unique constraint covering the columns `[actionToken]` on the table `appointments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "actionToken" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "appointments_actionToken_key" ON "appointments"("actionToken");
