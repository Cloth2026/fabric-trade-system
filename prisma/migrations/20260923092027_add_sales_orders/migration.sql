-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "customerId" TEXT NOT NULL,
    "contactId" TEXT,
    "sourceQuoteId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedDeliveryDate" TIMESTAMP(3),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CNY',
    "exchangeRate" DECIMAL(14,6) NOT NULL DEFAULT 1,
    "priceTerms" TEXT,
    "deliveryTerms" TEXT,
    "paymentTerms" TEXT,
    "taxRate" DECIMAL(6,3),
    "receiverName" TEXT,
    "receiverPhone" TEXT,
    "receiverAddress" TEXT,
    "remark" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fabricId" TEXT NOT NULL,
    "sourceQuoteItemId" TEXT,
    "fabricSupplierId" TEXT,
    "fabricSupplierQuoteId" TEXT,
    "unit" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "deliveredQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "costPrice" DECIMAL(12,2),
    "taxRate" DECIMAL(6,3),
    "leadTime" TEXT,
    "colorOrRemark" TEXT,
    "remark" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_status_idx" ON "SalesOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_customerId_idx" ON "SalesOrder"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_contactId_idx" ON "SalesOrder"("tenantId", "contactId");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_orderDate_idx" ON "SalesOrder"("tenantId", "orderDate");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_requestedDeliveryDate_idx" ON "SalesOrder"("tenantId", "requestedDeliveryDate");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_sourceQuoteId_idx" ON "SalesOrder"("tenantId", "sourceQuoteId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_tenantId_code_key" ON "SalesOrder"("tenantId", "code");

-- CreateIndex
CREATE INDEX "SalesOrderItem_tenantId_orderId_idx" ON "SalesOrderItem"("tenantId", "orderId");

-- CreateIndex
CREATE INDEX "SalesOrderItem_tenantId_fabricId_idx" ON "SalesOrderItem"("tenantId", "fabricId");

-- CreateIndex
CREATE INDEX "SalesOrderItem_fabricSupplierId_idx" ON "SalesOrderItem"("fabricSupplierId");

-- CreateIndex
CREATE INDEX "SalesOrderItem_fabricSupplierQuoteId_idx" ON "SalesOrderItem"("fabricSupplierQuoteId");

-- CreateIndex
CREATE INDEX "SalesOrderItem_sourceQuoteItemId_idx" ON "SalesOrderItem"("sourceQuoteItemId");

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CustomerContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_sourceQuoteId_fkey" FOREIGN KEY ("sourceQuoteId") REFERENCES "CustomerQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_fabricId_fkey" FOREIGN KEY ("fabricId") REFERENCES "Fabric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_sourceQuoteItemId_fkey" FOREIGN KEY ("sourceQuoteItemId") REFERENCES "CustomerQuoteItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_fabricSupplierId_fkey" FOREIGN KEY ("fabricSupplierId") REFERENCES "FabricSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_fabricSupplierQuoteId_fkey" FOREIGN KEY ("fabricSupplierQuoteId") REFERENCES "FabricSupplierQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
