-- Every fabric price is split into a tax-exclusive and a tax-inclusive column,
-- plus a hand-entered tax rate. Historical values are treated as tax-exclusive
-- (agreed 2026-09-25), so the old column is renamed instead of dropped.
-- The rate is stored as a fraction (0.13 = 13%), matching CustomerQuote.taxRate.

ALTER TABLE "Fabric" RENAME COLUMN "finishedReferencePrice" TO "finishedReferencePriceExclTax";
ALTER TABLE "Fabric" ADD COLUMN "finishedReferencePriceInclTax" DECIMAL(12, 2);
ALTER TABLE "Fabric" ADD COLUMN "finishedReferenceTaxRate" DECIMAL(6, 3);

ALTER TABLE "FabricSupplierQuote" RENAME COLUMN "purchasePrice" TO "purchasePriceExclTax";
ALTER TABLE "FabricSupplierQuote" ADD COLUMN "purchasePriceInclTax" DECIMAL(12, 2);
ALTER TABLE "FabricSupplierQuote" ADD COLUMN "purchaseTaxRate" DECIMAL(6, 3);

ALTER TABLE "GreigeFabric" RENAME COLUMN "unitPrice" TO "unitPriceExclTax";
ALTER TABLE "GreigeFabric" ADD COLUMN "unitPriceInclTax" DECIMAL(12, 2);
ALTER TABLE "GreigeFabric" ADD COLUMN "taxRate" DECIMAL(6, 3);

ALTER TABLE "DyeingFinishing" RENAME COLUMN "unitPrice" TO "unitPriceExclTax";
ALTER TABLE "DyeingFinishing" ADD COLUMN "unitPriceInclTax" DECIMAL(12, 2);
ALTER TABLE "DyeingFinishing" ADD COLUMN "taxRate" DECIMAL(6, 3);

ALTER TABLE "PostProcess" RENAME COLUMN "unitPrice" TO "unitPriceExclTax";
ALTER TABLE "PostProcess" ADD COLUMN "unitPriceInclTax" DECIMAL(12, 2);
ALTER TABLE "PostProcess" ADD COLUMN "taxRate" DECIMAL(6, 3);
