/*
  Warnings:

  - Added the required column `subtotal` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "comprobanteFile" VARCHAR(255),
ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentInfo" JSONB,
ADD COLUMN     "paymentMethod" VARCHAR(50) NOT NULL DEFAULT 'receipt',
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "shipping" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "tax" DECIMAL(10,2) NOT NULL DEFAULT 0;
