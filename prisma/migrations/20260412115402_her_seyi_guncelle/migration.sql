/*
  Warnings:

  - You are about to drop the `appointments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `customers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gallery_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reviews` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `services` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shop_closures` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `staff_leaves` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `staffs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_customerId_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_staffId_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_userId_fkey";

-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_userId_fkey";

-- DropForeignKey
ALTER TABLE "gallery_items" DROP CONSTRAINT "gallery_items_userId_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_userId_fkey";

-- DropForeignKey
ALTER TABLE "services" DROP CONSTRAINT "services_userId_fkey";

-- DropForeignKey
ALTER TABLE "shop_closures" DROP CONSTRAINT "shop_closures_userId_fkey";

-- DropForeignKey
ALTER TABLE "staff_leaves" DROP CONSTRAINT "staff_leaves_staffId_fkey";

-- DropForeignKey
ALTER TABLE "staff_leaves" DROP CONSTRAINT "staff_leaves_userId_fkey";

-- DropForeignKey
ALTER TABLE "staffs" DROP CONSTRAINT "staffs_userId_fkey";

-- DropTable
DROP TABLE "appointments";

-- DropTable
DROP TABLE "customers";

-- DropTable
DROP TABLE "gallery_items";

-- DropTable
DROP TABLE "reviews";

-- DropTable
DROP TABLE "services";

-- DropTable
DROP TABLE "shop_closures";

-- DropTable
DROP TABLE "staff_leaves";

-- DropTable
DROP TABLE "staffs";

-- DropTable
DROP TABLE "users";

-- DropEnum
DROP TYPE "PlanType";

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "category" TEXT,
    "slug" TEXT,
    "phone" TEXT,
    "tagline" TEXT,
    "description" TEXT,
    "logo" TEXT,
    "coverImage" TEXT,
    "city" TEXT,
    "district" TEXT,
    "addressTitle" TEXT,
    "fullAddress" TEXT,
    "address" TEXT,
    "googleMapsUrl" TEXT,
    "workStart" TEXT NOT NULL DEFAULT '09:00',
    "workEnd" TEXT NOT NULL DEFAULT '20:00',
    "instagram" TEXT,
    "facebook" TEXT,
    "twitter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "msgTemplateOnay" TEXT DEFAULT 'Merhaba {musteri_adi}, {salon_adi} için {tarih} {saat} randevunuz onaylanmıştır.',
    "msgTemplateIptal" TEXT DEFAULT 'Merhaba {musteri_adi}, {tarih} {saat} randevunuz iptal edilmiştir.',
    "msgTemplateHatirlatma" TEXT DEFAULT 'Hatırlatma: {salon_adi} için {tarih} {saat} randevunuz yaklaşıyor.',
    "verificationCode" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "resetCode" TEXT,
    "resetCodeExpires" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "userId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "notes" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "customerName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_slug_key" ON "User"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
