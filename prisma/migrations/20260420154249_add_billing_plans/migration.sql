-- CreateEnum
CREATE TYPE "PlanInterval" AS ENUM ('MONTH', 'YEAR', 'LIFETIME');

-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'LIFETIME';

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "compareAtPriceCents" INTEGER DEFAULT 0,
ADD COLUMN     "customDomainEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deliveryZonesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "interval" "PlanInterval" NOT NULL DEFAULT 'MONTH',
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxMenuItems" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "maxMonthlyOrders" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN     "prioritySupport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tagline" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "lifetimePurchasedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PlanInvoice" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3),
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "screenshotUrl" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanInvoice_tenantId_createdAt_idx" ON "PlanInvoice"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "PlanInvoice_subscriptionId_idx" ON "PlanInvoice"("subscriptionId");

-- CreateIndex
CREATE INDEX "PlanInvoice_status_idx" ON "PlanInvoice"("status");

-- CreateIndex
CREATE INDEX "Plan_isActive_sortOrder_idx" ON "Plan"("isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "PlanInvoice" ADD CONSTRAINT "PlanInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
