-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "productImage" VARCHAR(255),
ADD COLUMN     "productName" VARCHAR(100),
ADD COLUMN     "selectedColor" VARCHAR(50),
ADD COLUMN     "selectedShoeSize" VARCHAR(50),
ADD COLUMN     "selectedSize" VARCHAR(50);
