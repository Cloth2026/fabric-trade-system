-- Preserve historical quote production-unit references.
ALTER TABLE "FabricSupplierQuote" DROP CONSTRAINT "FabricSupplierQuote_supplierUnitId_fkey";

ALTER TABLE "FabricSupplierQuote"
ADD CONSTRAINT "FabricSupplierQuote_supplierUnitId_fkey"
FOREIGN KEY ("supplierUnitId") REFERENCES "SupplierUnit"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
