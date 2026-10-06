-- AlterTable: expose the cancellation reason on the service record itself
-- so the detail view can show it without reading audit entries.
ALTER TABLE "ServiceRecord" ADD COLUMN "cancelReason" TEXT;
