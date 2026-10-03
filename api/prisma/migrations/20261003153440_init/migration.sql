-- CreateEnum
CREATE TYPE "ServiceRecordStatus" AS ENUM ('COMPLETED', 'CANCELED');

-- CreateTable
CREATE TABLE "ServiceRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activityId" UUID NOT NULL,
    "serviceTypeId" UUID NOT NULL,
    "serviceTypeName" TEXT NOT NULL,
    "familyId" UUID NOT NULL,
    "personId" UUID,
    "membershipId" UUID,
    "executorName" TEXT NOT NULL,
    "executorRole" TEXT NOT NULL,
    "occurredAt" DATE NOT NULL,
    "recordedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" UUID NOT NULL,
    "note" TEXT,
    "status" "ServiceRecordStatus" NOT NULL DEFAULT 'COMPLETED',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeVisit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "serviceRecordId" UUID NOT NULL,
    "observedSituation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRecordAuditEntry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "serviceRecordId" UUID NOT NULL,
    "operation" TEXT NOT NULL,
    "performedBy" UUID NOT NULL,
    "performedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRecordAuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReceipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryLine" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BazarTransfer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BazarTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceRecord_familyId_occurredAt_idx" ON "ServiceRecord"("familyId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "ServiceRecord_personId_idx" ON "ServiceRecord"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeVisit_serviceRecordId_key" ON "HomeVisit"("serviceRecordId");

-- CreateIndex
CREATE INDEX "ServiceRecordAuditEntry_serviceRecordId_idx" ON "ServiceRecordAuditEntry"("serviceRecordId");

-- AddForeignKey
ALTER TABLE "HomeVisit" ADD CONSTRAINT "HomeVisit_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "ServiceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecordAuditEntry" ADD CONSTRAINT "ServiceRecordAuditEntry_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "ServiceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
