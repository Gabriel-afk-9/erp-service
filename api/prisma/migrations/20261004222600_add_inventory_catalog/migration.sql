-- CreateEnum (declared for EST-3b StockReceipt; no table created in this BUILD)
CREATE TYPE "DonationOriginType" AS ENUM ('PERSON', 'ORGANIZATION', 'CAMPAIGN', 'BAZAR', 'AD_HOC', 'UNKNOWN');

-- AlterTable: expand Category stub (id/createdAt/updatedAt) into the EST-3a catalog model
ALTER TABLE "Category" ADD COLUMN "name" VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE "Category" ADD COLUMN "description" VARCHAR(500);
ALTER TABLE "Category" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Category" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Category" ALTER COLUMN "name" DROP DEFAULT;
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- AlterTable: expand Unit stub into the EST-3a catalog model
ALTER TABLE "Unit" ADD COLUMN "symbol" VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE "Unit" ADD COLUMN "name" VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE "Unit" ADD COLUMN "decimalPlaces" SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE "Unit" ADD COLUMN "quantityIncrement" DECIMAL(10, 4) NOT NULL DEFAULT 1;
ALTER TABLE "Unit" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Unit" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Unit" ALTER COLUMN "symbol" DROP DEFAULT;
ALTER TABLE "Unit" ALTER COLUMN "name" DROP DEFAULT;
ALTER TABLE "Unit" ALTER COLUMN "decimalPlaces" DROP DEFAULT;
ALTER TABLE "Unit" ALTER COLUMN "quantityIncrement" DROP DEFAULT;
CREATE UNIQUE INDEX "Unit_symbol_key" ON "Unit"("symbol");

-- AlterTable: expand Item stub into the EST-3a catalog model
ALTER TABLE "Item" ADD COLUMN "categoryId" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Item" ADD COLUMN "unitId" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Item" ADD COLUMN "name" VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE "Item" ADD COLUMN "description" VARCHAR(500);
ALTER TABLE "Item" ADD COLUMN "requiresExpiration" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Item" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Item" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Item" ALTER COLUMN "categoryId" DROP DEFAULT;
ALTER TABLE "Item" ALTER COLUMN "unitId" DROP DEFAULT;
ALTER TABLE "Item" ALTER COLUMN "name" DROP DEFAULT;
ALTER TABLE "Item" ALTER COLUMN "requiresExpiration" DROP DEFAULT;
CREATE UNIQUE INDEX "Item_categoryId_name_key" ON "Item"("categoryId", "name");
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");
CREATE INDEX "Item_name_idx" ON "Item"("name");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Item" ADD CONSTRAINT "Item_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
