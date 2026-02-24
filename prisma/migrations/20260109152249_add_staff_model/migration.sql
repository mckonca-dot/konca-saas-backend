/*
  Warnings:

  - You are about to drop the column `email` on the `customers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "staffId" INTEGER,
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "email";

-- CreateTable
CREATE TABLE "staffs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staffs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "staffs" ADD CONSTRAINT "staffs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staffs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
