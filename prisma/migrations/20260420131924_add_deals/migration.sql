-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('PERCENT_OFF', 'FLAT_OFF', 'FREE_DELIVERY');

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "percentBps" INTEGER,
    "flatOffCents" INTEGER,
    "minOrderCents" INTEGER NOT NULL DEFAULT 0,
    "type" "DealType" NOT NULL,
    "heroImageUrl" TEXT,
    "bgColor" TEXT,
    "ctaLabel" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deal_tenantId_isActive_idx" ON "Deal"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "Deal_tenantId_sortOrder_idx" ON "Deal"("tenantId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
