-- AlterEnum: delivery movement types were missing (SPEC-ENT requires them)
ALTER TYPE "MovementType" ADD VALUE 'DELIVERY_OUT';
ALTER TYPE "MovementType" ADD VALUE 'DELIVERY_REVERSAL';

-- AlterEnum: reversed attendance (SPEC-ENT section 3, D-07)
ALTER TYPE "ServiceRecordStatus" ADD VALUE 'REVERSED';

-- AlterTable: link reversal to the original outflow (unique when filled)
ALTER TABLE "StockMovement" ADD COLUMN "reversesMovementId" UUID;
CREATE UNIQUE INDEX "StockMovement_reversesMovementId_key" ON "StockMovement"("reversesMovementId");

-- AlterTable: expand Delivery stub into the FASE 5 delivery model
ALTER TABLE "Delivery" ADD COLUMN "serviceRecordId" UUID;
ALTER TABLE "Delivery" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Delivery" ADD COLUMN "assessmentId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Delivery" ADD COLUMN "eligibilityStatus" VARCHAR(20) NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Delivery" ADD COLUMN "occurredAt" DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE "Delivery" ADD COLUMN "collectedByPersonId" UUID;
ALTER TABLE "Delivery" ADD COLUMN "collectedByMembershipId" UUID;
ALTER TABLE "Delivery" ADD COLUMN "executorName" VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE "Delivery" ADD COLUMN "executorRole" VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE "Delivery" ADD COLUMN "exceptionReason" VARCHAR(500);
ALTER TABLE "Delivery" ADD COLUMN "authorizedBy" VARCHAR(200);
ALTER TABLE "Delivery" ADD COLUMN "operationKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Delivery" ADD COLUMN "fingerprint" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Delivery" ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE "Delivery" ALTER COLUMN "serviceRecordId" SET NOT NULL;
ALTER TABLE "Delivery" ALTER COLUMN "familyId" DROP DEFAULT;
ALTER TABLE "Delivery" ALTER COLUMN "assessmentId" DROP DEFAULT;
ALTER TABLE "Delivery" ALTER COLUMN "eligibilityStatus" DROP DEFAULT;
ALTER TABLE "Delivery" ALTER COLUMN "occurredAt" DROP DEFAULT;
ALTER TABLE "Delivery" ALTER COLUMN "executorName" DROP DEFAULT;
ALTER TABLE "Delivery" ALTER COLUMN "executorRole" DROP DEFAULT;
ALTER TABLE "Delivery" ALTER COLUMN "operationKey" DROP DEFAULT;
ALTER TABLE "Delivery" ALTER COLUMN "fingerprint" DROP DEFAULT;
ALTER TABLE "Delivery" ALTER COLUMN "status" DROP DEFAULT;
CREATE UNIQUE INDEX "Delivery_serviceRecordId_key" ON "Delivery"("serviceRecordId");
CREATE UNIQUE INDEX "Delivery_operationKey_key" ON "Delivery"("operationKey");
CREATE INDEX "Delivery_familyId_occurredAt_idx" ON "Delivery"("familyId", "occurredAt" DESC);

-- AlterTable: expand DeliveryLine stub into the FASE 5 line model
ALTER TABLE "DeliveryLine" ADD COLUMN "deliveryId" UUID;
ALTER TABLE "DeliveryLine" ADD COLUMN "stockLotId" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "DeliveryLine" ADD COLUMN "unitId" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "DeliveryLine" ADD COLUMN "quantity" DECIMAL(14,4) NOT NULL DEFAULT 0;
ALTER TABLE "DeliveryLine" ALTER COLUMN "deliveryId" SET NOT NULL;
ALTER TABLE "DeliveryLine" ALTER COLUMN "stockLotId" DROP DEFAULT;
ALTER TABLE "DeliveryLine" ALTER COLUMN "unitId" DROP DEFAULT;
ALTER TABLE "DeliveryLine" ALTER COLUMN "quantity" DROP DEFAULT;
CREATE UNIQUE INDEX "DeliveryLine_deliveryId_stockLotId_key" ON "DeliveryLine"("deliveryId", "stockLotId");
CREATE INDEX "DeliveryLine_deliveryId_idx" ON "DeliveryLine"("deliveryId");

-- CreateTable
CREATE TABLE "DeliveryReversal" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "deliveryId" UUID NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "reversedAt" DATE NOT NULL,
    "reversedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryReversal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeliveryReversal_deliveryId_key" ON "DeliveryReversal"("deliveryId");

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "ServiceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveryLine" ADD CONSTRAINT "DeliveryLine_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveryReversal" ADD CONSTRAINT "DeliveryReversal_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
