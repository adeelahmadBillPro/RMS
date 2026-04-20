-- CreateEnum
CREATE TYPE "DeliveryAssignmentStatus" AS ENUM ('ASSIGNED', 'PICKED_UP', 'DELIVERED', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryCashStatus" AS ENUM ('PENDING', 'RECONCILED', 'DISPUTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'DELIVERY_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'DELIVERY_PICKED_UP';
ALTER TYPE "AuditAction" ADD VALUE 'DELIVERY_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'DELIVERY_RETURNED';
ALTER TYPE "AuditAction" ADD VALUE 'DELIVERY_CASH_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'DELIVERY_CASH_RECONCILED';

-- CreateTable
CREATE TABLE "DeliveryAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "deliveryUserId" TEXT NOT NULL,
    "status" "DeliveryAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "collectedCashCents" INTEGER NOT NULL DEFAULT 0,
    "cashSubmissionId" TEXT,
    "notes" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "returnReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryCashSubmission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deliveryUserId" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "status" "DeliveryCashStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "reconcileNotes" TEXT,
    "reconciledById" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reconciledAt" TIMESTAMP(3),

    CONSTRAINT "DeliveryCashSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAssignment_orderId_key" ON "DeliveryAssignment"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryAssignment_tenantId_status_idx" ON "DeliveryAssignment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "DeliveryAssignment_deliveryUserId_status_idx" ON "DeliveryAssignment"("deliveryUserId", "status");

-- CreateIndex
CREATE INDEX "DeliveryAssignment_tenantId_assignedAt_idx" ON "DeliveryAssignment"("tenantId", "assignedAt");

-- CreateIndex
CREATE INDEX "DeliveryCashSubmission_tenantId_submittedAt_idx" ON "DeliveryCashSubmission"("tenantId", "submittedAt");

-- CreateIndex
CREATE INDEX "DeliveryCashSubmission_deliveryUserId_status_idx" ON "DeliveryCashSubmission"("deliveryUserId", "status");

-- AddForeignKey
ALTER TABLE "DeliveryAssignment" ADD CONSTRAINT "DeliveryAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAssignment" ADD CONSTRAINT "DeliveryAssignment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAssignment" ADD CONSTRAINT "DeliveryAssignment_deliveryUserId_fkey" FOREIGN KEY ("deliveryUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAssignment" ADD CONSTRAINT "DeliveryAssignment_cashSubmissionId_fkey" FOREIGN KEY ("cashSubmissionId") REFERENCES "DeliveryCashSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryCashSubmission" ADD CONSTRAINT "DeliveryCashSubmission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryCashSubmission" ADD CONSTRAINT "DeliveryCashSubmission_deliveryUserId_fkey" FOREIGN KEY ("deliveryUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
