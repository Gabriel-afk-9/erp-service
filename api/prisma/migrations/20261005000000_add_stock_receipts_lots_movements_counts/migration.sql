-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('DONATION_IN', 'TRIAGE_DISCARD', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'OPENING_BALANCE');

-- AlterTable: expand StockReceipt stub into the EST-3b receipt model
ALTER TABLE "StockReceipt" ADD COLUMN "originType" "DonationOriginType" NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "StockReceipt" ADD COLUMN "donorName" VARCHAR(200);
ALTER TABLE "StockReceipt" ADD COLUMN "receivedBy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StockReceipt" ADD COLUMN "receivedAt" DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE "StockReceipt" ADD COLUMN "note" VARCHAR(500);
ALTER TABLE "StockReceipt" ADD COLUMN "operationKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StockReceipt" ADD COLUMN "fingerprint" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StockReceipt" ALTER COLUMN "receivedBy" DROP DEFAULT;
ALTER TABLE "StockReceipt" ALTER COLUMN "receivedAt" DROP DEFAULT;
ALTER TABLE "StockReceipt" ALTER COLUMN "operationKey" DROP DEFAULT;
ALTER TABLE "StockReceipt" ALTER COLUMN "fingerprint" DROP DEFAULT;
CREATE UNIQUE INDEX "StockReceipt_operationKey_key" ON "StockReceipt"("operationKey");
CREATE INDEX "StockReceipt_receivedAt_idx" ON "StockReceipt"("receivedAt");

-- CreateTable
CREATE TABLE "ReceiptLine" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "receiptId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "informedQuantity" DECIMAL(14,4),
    "receivedQuantity" DECIMAL(14,4) NOT NULL,
    "acceptedQuantity" DECIMAL(14,4) NOT NULL,
    "rejectedQuantity" DECIMAL(14,4) NOT NULL,
    "rejectionReason" VARCHAR(500),
    "expiresOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptLine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReceiptLine_receiptId_idx" ON "ReceiptLine"("receiptId");
CREATE INDEX "ReceiptLine_itemId_idx" ON "ReceiptLine"("itemId");

-- AlterTable: expand StockLot stub into the EST-3b lot model
ALTER TABLE "StockLot" ADD COLUMN "itemId" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "StockLot" ADD COLUMN "unitId" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "StockLot" ADD COLUMN "receiptLineId" UUID;
ALTER TABLE "StockLot" ADD COLUMN "countLineId" UUID;
ALTER TABLE "StockLot" ADD COLUMN "expiresOn" DATE;
ALTER TABLE "StockLot" ALTER COLUMN "itemId" DROP DEFAULT;
ALTER TABLE "StockLot" ALTER COLUMN "unitId" DROP DEFAULT;
CREATE UNIQUE INDEX "StockLot_receiptLineId_key" ON "StockLot"("receiptLineId");
CREATE UNIQUE INDEX "StockLot_countLineId_key" ON "StockLot"("countLineId");
CREATE INDEX "StockLot_itemId_unitId_idx" ON "StockLot"("itemId", "unitId");

-- AlterTable: expand StockMovement stub into the EST-3b movement model
ALTER TABLE "StockMovement" ADD COLUMN "itemId" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "StockMovement" ADD COLUMN "unitId" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "StockMovement" ADD COLUMN "lotId" UUID;
ALTER TABLE "StockMovement" ADD COLUMN "receiptLineId" UUID;
ALTER TABLE "StockMovement" ADD COLUMN "countLineId" UUID;
ALTER TABLE "StockMovement" ADD COLUMN "type" "MovementType" NOT NULL DEFAULT 'DONATION_IN';
ALTER TABLE "StockMovement" ADD COLUMN "quantity" DECIMAL(14,4) NOT NULL DEFAULT 0;
ALTER TABLE "StockMovement" ADD COLUMN "balanceDelta" DECIMAL(14,4) NOT NULL DEFAULT 0;
ALTER TABLE "StockMovement" ADD COLUMN "occurredAt" DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE "StockMovement" ADD COLUMN "recordedBy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StockMovement" ADD COLUMN "reason" VARCHAR(500);
ALTER TABLE "StockMovement" ADD COLUMN "operationKey" TEXT;
ALTER TABLE "StockMovement" ALTER COLUMN "itemId" DROP DEFAULT;
ALTER TABLE "StockMovement" ALTER COLUMN "unitId" DROP DEFAULT;
ALTER TABLE "StockMovement" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "StockMovement" ALTER COLUMN "quantity" DROP DEFAULT;
ALTER TABLE "StockMovement" ALTER COLUMN "balanceDelta" DROP DEFAULT;
ALTER TABLE "StockMovement" ALTER COLUMN "occurredAt" DROP DEFAULT;
ALTER TABLE "StockMovement" ALTER COLUMN "recordedBy" DROP DEFAULT;
CREATE UNIQUE INDEX "StockMovement_operationKey_key" ON "StockMovement"("operationKey");
CREATE INDEX "StockMovement_itemId_unitId_occurredAt_idx" ON "StockMovement"("itemId", "unitId", "occurredAt");
CREATE INDEX "StockMovement_lotId_idx" ON "StockMovement"("lotId");
-- OPENING_BALANCE exists at most once per item (enforced in Prisma client as P2002 -> DuplicateOpeningBalanceError)
CREATE UNIQUE INDEX "StockMovement_opening_balance_once_idx" ON "StockMovement"("itemId") WHERE "type" = 'OPENING_BALANCE';

-- CreateTable
CREATE TABLE "StockCount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conductedBy" TEXT NOT NULL,
    "conductedAt" DATE NOT NULL,
    "closedAt" DATE,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCountLine" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "countId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "lotId" UUID,
    "expiresOn" DATE,
    "expectedQuantity" DECIMAL(14,4) NOT NULL,
    "countedQuantity" DECIMAL(14,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockCountLine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StockCountLine_countId_idx" ON "StockCountLine"("countId");

-- AddForeignKey
ALTER TABLE "ReceiptLine" ADD CONSTRAINT "ReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "StockReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_receiptLineId_fkey" FOREIGN KEY ("receiptLineId") REFERENCES "ReceiptLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_countLineId_fkey" FOREIGN KEY ("countLineId") REFERENCES "StockCountLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "StockLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockCountLine" ADD CONSTRAINT "StockCountLine_countId_fkey" FOREIGN KEY ("countId") REFERENCES "StockCount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
