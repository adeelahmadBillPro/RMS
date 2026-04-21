-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerUserId" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "deliveryAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "deliveryFeeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryMinOrderCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryRadiusKm" DECIMAL(5,2);

-- CreateIndex
CREATE INDEX "Order_customerUserId_idx" ON "Order"("customerUserId");
