-- CreateTable
CREATE TABLE "CustomerQuote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "customerId" TEXT NOT NULL,
    "contactId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CNY',
    "quoteDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "priceTerms" TEXT,
    "deliveryTerms" TEXT,
    "leadTime" TEXT,
    "paymentTerms" TEXT,
    "taxRate" DECIMAL(6,3),
    "remark" TEXT,
    "sentAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerQuoteItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "fabricId" TEXT NOT NULL,
    "fabricSupplierQuoteId" TEXT,
    "unit" TEXT,
    "quantity" DECIMAL(12,3),
    "minimumOrderQty" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "costPrice" DECIMAL(12,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CNY',
    "taxRate" DECIMAL(6,3),
    "leadTime" TEXT,
    "colorOrRemark" TEXT,
    "remark" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerQuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerQuote_tenantId_status_idx" ON "CustomerQuote"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CustomerQuote_tenantId_customerId_idx" ON "CustomerQuote"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "CustomerQuote_tenantId_contactId_idx" ON "CustomerQuote"("tenantId", "contactId");

-- CreateIndex
CREATE INDEX "CustomerQuote_tenantId_quoteDate_idx" ON "CustomerQuote"("tenantId", "quoteDate");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerQuote_tenantId_code_key" ON "CustomerQuote"("tenantId", "code");

-- CreateIndex
CREATE INDEX "CustomerQuoteItem_tenantId_quoteId_idx" ON "CustomerQuoteItem"("tenantId", "quoteId");

-- CreateIndex
CREATE INDEX "CustomerQuoteItem_tenantId_fabricId_idx" ON "CustomerQuoteItem"("tenantId", "fabricId");

-- CreateIndex
CREATE INDEX "CustomerQuoteItem_fabricSupplierQuoteId_idx" ON "CustomerQuoteItem"("fabricSupplierQuoteId");

-- AddForeignKey
ALTER TABLE "CustomerQuote" ADD CONSTRAINT "CustomerQuote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerQuote" ADD CONSTRAINT "CustomerQuote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerQuote" ADD CONSTRAINT "CustomerQuote_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CustomerContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerQuoteItem" ADD CONSTRAINT "CustomerQuoteItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerQuoteItem" ADD CONSTRAINT "CustomerQuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "CustomerQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerQuoteItem" ADD CONSTRAINT "CustomerQuoteItem_fabricId_fkey" FOREIGN KEY ("fabricId") REFERENCES "Fabric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerQuoteItem" ADD CONSTRAINT "CustomerQuoteItem_fabricSupplierQuoteId_fkey" FOREIGN KEY ("fabricSupplierQuoteId") REFERENCES "FabricSupplierQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
