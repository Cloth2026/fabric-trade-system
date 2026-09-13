-- CreateTable
CREATE TABLE "FabricSupplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fabricId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierFabricCode" TEXT,
    "purchasePrice" DECIMAL(12,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CNY',
    "pricingUnit" "PricingUnit" NOT NULL,
    "minimumOrderQty" TEXT,
    "leadTime" TEXT,
    "contactName" TEXT,
    "quoteDate" TIMESTAMP(3),
    "sampleStatus" TEXT,
    "qualityDifferences" TEXT,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FabricSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FabricSupplierQuote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fabricSupplierId" TEXT NOT NULL,
    "fabricId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierFabricCode" TEXT,
    "purchasePrice" DECIMAL(12,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CNY',
    "pricingUnit" "PricingUnit" NOT NULL,
    "minimumOrderQty" TEXT,
    "leadTime" TEXT,
    "contactName" TEXT,
    "quoteDate" TIMESTAMP(3),
    "qualityDifferences" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FabricSupplierQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FabricSupplier_tenantId_idx" ON "FabricSupplier"("tenantId");

-- CreateIndex
CREATE INDEX "FabricSupplier_tenantId_fabricId_idx" ON "FabricSupplier"("tenantId", "fabricId");

-- CreateIndex
CREATE INDEX "FabricSupplier_tenantId_supplierId_idx" ON "FabricSupplier"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "FabricSupplier_tenantId_isPreferred_idx" ON "FabricSupplier"("tenantId", "isPreferred");

-- CreateIndex
CREATE UNIQUE INDEX "FabricSupplier_tenantId_fabricId_supplierId_key" ON "FabricSupplier"("tenantId", "fabricId", "supplierId");

-- CreateIndex
CREATE INDEX "FabricSupplierQuote_tenantId_idx" ON "FabricSupplierQuote"("tenantId");

-- CreateIndex
CREATE INDEX "FabricSupplierQuote_tenantId_fabricId_idx" ON "FabricSupplierQuote"("tenantId", "fabricId");

-- CreateIndex
CREATE INDEX "FabricSupplierQuote_tenantId_supplierId_idx" ON "FabricSupplierQuote"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "FabricSupplierQuote_fabricSupplierId_quoteDate_idx" ON "FabricSupplierQuote"("fabricSupplierId", "quoteDate");

-- AddForeignKey
ALTER TABLE "FabricSupplier" ADD CONSTRAINT "FabricSupplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricSupplier" ADD CONSTRAINT "FabricSupplier_fabricId_fkey" FOREIGN KEY ("fabricId") REFERENCES "Fabric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricSupplier" ADD CONSTRAINT "FabricSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricSupplierQuote" ADD CONSTRAINT "FabricSupplierQuote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricSupplierQuote" ADD CONSTRAINT "FabricSupplierQuote_fabricSupplierId_fkey" FOREIGN KEY ("fabricSupplierId") REFERENCES "FabricSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricSupplierQuote" ADD CONSTRAINT "FabricSupplierQuote_fabricId_fkey" FOREIGN KEY ("fabricId") REFERENCES "Fabric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricSupplierQuote" ADD CONSTRAINT "FabricSupplierQuote_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
