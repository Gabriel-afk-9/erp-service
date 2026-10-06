-- AlterEnum: BAZAR_IN was missing from the EST-3b enum (SPEC-BAZ requires it)
ALTER TYPE "MovementType" ADD VALUE 'BAZAR_IN';

-- AlterTable: expand BazarTransfer stub into the FASE 4 transfer model
ALTER TABLE "BazarTransfer" ADD COLUMN "receiptId" UUID;
ALTER TABLE "BazarTransfer" ADD COLUMN "externalReference" VARCHAR(200);
ALTER TABLE "BazarTransfer" ALTER COLUMN "receiptId" SET NOT NULL;
ALTER TABLE "BazarTransfer" ALTER COLUMN "externalReference" SET NOT NULL;
CREATE UNIQUE INDEX "BazarTransfer_receiptId_key" ON "BazarTransfer"("receiptId");
CREATE UNIQUE INDEX "BazarTransfer_externalReference_key" ON "BazarTransfer"("externalReference");
CREATE INDEX "BazarTransfer_externalReference_idx" ON "BazarTransfer"("externalReference");

-- AddForeignKey
ALTER TABLE "BazarTransfer" ADD CONSTRAINT "BazarTransfer_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "StockReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
