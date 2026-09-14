-- Extend Supplier while preserving all legacy fields and existing rows.
ALTER TABLE "Supplier"
ADD COLUMN "roles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "country" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "socialContact" TEXT,
ADD COLUMN "specialties" TEXT,
ADD COLUMN "defaultLeadTime" TEXT,
ADD COLUMN "defaultMoq" TEXT,
ADD COLUMN "paymentTerms" TEXT,
ADD COLUMN "cooperationComment" TEXT,
ADD COLUMN "riskNote" TEXT,
ADD COLUMN "remarks" TEXT;

-- CreateTable
CREATE TABLE "SupplierUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitForm" TEXT NOT NULL,
    "businessTypes" TEXT[] NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "primaryBusiness" TEXT,
    "primaryProducts" TEXT,
    "materialScope" TEXT,
    "processCapabilities" TEXT,
    "restrictions" TEXT,
    "defaultMoq" TEXT,
    "regularLeadTime" TEXT,
    "peakLeadTime" TEXT,
    "supportsSampling" BOOLEAN NOT NULL DEFAULT true,
    "managerName" TEXT,
    "phone" TEXT,
    "socialContact" TEXT,
    "qualityFeatures" TEXT,
    "riskNote" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierUnit_pkey" PRIMARY KEY ("id")
);

-- Add nullable production-unit references without changing existing source or quote rows.
ALTER TABLE "FabricSupplier" ADD COLUMN "supplierUnitId" TEXT;
ALTER TABLE "FabricSupplierQuote" ADD COLUMN "supplierUnitId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SupplierUnit_tenantId_supplierId_name_key" ON "SupplierUnit"("tenantId", "supplierId", "name");
CREATE INDEX "SupplierUnit_tenantId_idx" ON "SupplierUnit"("tenantId");
CREATE INDEX "SupplierUnit_supplierId_idx" ON "SupplierUnit"("supplierId");
CREATE INDEX "SupplierUnit_tenantId_status_idx" ON "SupplierUnit"("tenantId", "status");
CREATE INDEX "FabricSupplier_supplierUnitId_idx" ON "FabricSupplier"("supplierUnitId");
CREATE INDEX "FabricSupplierQuote_supplierUnitId_idx" ON "FabricSupplierQuote"("supplierUnitId");

-- AddForeignKey
ALTER TABLE "SupplierUnit" ADD CONSTRAINT "SupplierUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierUnit" ADD CONSTRAINT "SupplierUnit_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FabricSupplier" ADD CONSTRAINT "FabricSupplier_supplierUnitId_fkey" FOREIGN KEY ("supplierUnitId") REFERENCES "SupplierUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FabricSupplierQuote" ADD CONSTRAINT "FabricSupplierQuote_supplierUnitId_fkey" FOREIGN KEY ("supplierUnitId") REFERENCES "SupplierUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
